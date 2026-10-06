/*
 * Passport extraction: component source -> derived passport fields.
 *
 * Uses the TypeScript TypeChecker, not regex, so `extends` chains resolve. The
 * central rule is ORIGIN FILTERING:
 *
 *   own / shared source  -> flatten and enumerate   (GridOptions, ComboboxSharedProps…)
 *   library source       -> keep as an `inherits` edge, plus a policy allowlist
 *
 * Measured on this repo: full flattening yields 6,232 props (Tabs alone 853);
 * AST-only yields 633 and misses half the grid's API. Origin filtering gives
 * the real public surface.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { allowlistFor } = require("./policy.cjs");

const PASSPORT_VERSION = "1.0.0";

/**
 * Resolve the TypeScript compiler API.
 *
 * Generation-time only — never needed to USE a component, so this stays out of
 * the runtime dependency story. The caller's project is searched first, so a
 * consumer regenerating a forked component uses their own TypeScript.
 */
function loadTypeScript(searchFrom = []) {
  const paths = [...searchFrom, process.cwd(), __dirname].filter(Boolean);
  try {
    return require(require.resolve("typescript", { paths }));
  } catch {
    try {
      return require("typescript");
    } catch {
      const error = new Error(
        "Passport generation needs the TypeScript compiler API.\n" +
          "  Install it as a dev dependency:  npm i -D typescript\n" +
          "  It is only needed to generate passports, never to run a component.",
      );
      error.code = "ETYPESCRIPT_MISSING";
      throw error;
    }
  }
}

const posix = (p) => p.replace(/\\/g, "/");

/** Every .ts/.tsx under a directory, excluding tests. */
function sourceFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "__tests__") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Hash of the inputs the passport is derived from. Deterministic: sorted paths,
 * file contents only, no timestamps.
 */
function hashSources(files, root) {
  const h = crypto.createHash("sha256");
  for (const f of [...files].sort()) {
    h.update(posix(path.relative(root, f)));
    h.update("\0");
    h.update(fs.readFileSync(f));
    h.update("\0");
  }
  return `sha256:${h.digest("hex")}`;
}

/* ------------------------------------------------------------------ program */

/**
 * One program across every component, so cross-file project-local types
 * (GridOptions, ComboboxSharedProps) resolve properly.
 */
function createProgram(ts, libRoot, components, reactTypesDir) {
  const entries = components
    .map((c) => path.join(libRoot, c, "index.ts"))
    .filter((f) => fs.existsSync(f));

  const options = {
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  };
  if (reactTypesDir) {
    options.baseUrl = path.dirname(path.dirname(reactTypesDir));
    options.paths = {
      react: [reactTypesDir],
      "react/*": [`${reactTypesDir}/*`],
      "react-dom": [reactTypesDir.replace(/react$/, "react-dom")],
    };
  }
  return ts.createProgram(entries, options);
}

/** Where a declaration lives, which decides flatten-vs-edge. */
function originOfDeclaration(decl, libRoot) {
  if (!decl) return "unknown";
  const file = posix(decl.getSourceFile().fileName);
  if (file.includes("/node_modules/") || /\/lib\.[a-z0-9.]+\.d\.ts$/.test(file)) return "inherited";
  if (file.includes(`${posix(libRoot)}/shared/`)) return "shared";
  if (file.startsWith(posix(libRoot))) return "own";
  return "inherited";
}

/* --------------------------------------------------------------- type shape */

/** A compact, stable description of a property's type. */
function describeType(ts, checker, type, node) {
  const text = checker.typeToString(
    type,
    node,
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType,
  );

  // Optional props are `T | undefined`. Classify on T, or every optional
  // callback reads as an anonymous union rather than a function.
  const NULLISH = ts.TypeFlags.Undefined | ts.TypeFlags.Null;
  if (type.isUnion()) {
    const defined = type.types.filter((t) => !(t.flags & NULLISH));
    if (defined.length === 1) type = defined[0];
  }

  if (type.isUnion()) {
    const parts = type.types;
    const literals = parts.filter((t) => t.isStringLiteral());
    const nonLiteral = parts.filter(
      (t) => !t.isStringLiteral() && !(t.flags & ts.TypeFlags.Undefined),
    );
    // A pure union of string literals is an enum worth enumerating.
    if (literals.length >= 2 && nonLiteral.length === 0) {
      return { type: "enum", values: literals.map((t) => t.value).sort(), typeText: text };
    }
    const boolish = parts.every(
      (t) => t.flags & (ts.TypeFlags.BooleanLike | ts.TypeFlags.Undefined),
    );
    if (boolish) return { type: "boolean", typeText: text };
  }

  if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0) {
    return { type: "function", signature: text.length > 200 ? `${text.slice(0, 197)}…` : text };
  }
  if (type.flags & ts.TypeFlags.StringLike) return { type: "string", typeText: text };
  if (type.flags & ts.TypeFlags.NumberLike) return { type: "number", typeText: text };
  if (type.flags & ts.TypeFlags.BooleanLike) return { type: "boolean", typeText: text };

  return { type: "other", typeText: text.length > 200 ? `${text.slice(0, 197)}…` : text };
}

/** First JSDoc sentence attached to a symbol, or undefined. Never invented. */
function jsDocOf(ts, sym) {
  const parts = sym.getDocumentationComment(undefined);
  if (!parts || parts.length === 0) return undefined;
  const text = ts.displayPartsToString(parts).trim();
  return text || undefined;
}

/* ------------------------------------------------------ defaults from source */

/**
 * Defaults are written as destructuring defaults in the component function
 * (`size = "md"`), which is the only place they exist. Best-effort and marked
 * as derived; absent when not found.
 */
/** `"md"` -> md, `false` -> false, `12` -> 12; anything long or complex is dropped. */
function normaliseDefault(text) {
  if (text.length > 40) return undefined;
  const quoted = text.match(/^["'`](.*)["'`]$/s);
  if (quoted) return quoted[1];
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text === "null") return null;
  return text;
}

function collectDefaults(ts, sourceFileList, program) {
  const defaults = new Map(); // "Component.prop" -> literal text
  for (const file of sourceFileList) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    sf.forEachChild((node) => {
      if (!ts.isFunctionDeclaration(node) || !node.name) return;
      const comp = node.name.text;
      for (const param of node.parameters) {
        if (!ts.isObjectBindingPattern(param.name)) continue;
        for (const el of param.name.elements) {
          if (!el.initializer || !ts.isIdentifier(el.name)) continue;
          const init = normaliseDefault(el.initializer.getText(sf));
          if (init !== undefined) defaults.set(`${comp}.${el.name.text}`, init);
        }
      }
      // `const { a = 1 } = props` inside the body
      if (node.body) {
        for (const stmt of node.body.statements) {
          if (!ts.isVariableStatement(stmt)) continue;
          for (const d of stmt.declarationList.declarations) {
            if (!ts.isObjectBindingPattern(d.name)) continue;
            for (const el of d.name.elements) {
              if (!el.initializer || !ts.isIdentifier(el.name)) continue;
              const init = normaliseDefault(el.initializer.getText(sf));
              if (init !== undefined) defaults.set(`${comp}.${el.name.text}`, init);
            }
          }
        }
      }
    });
  }
  return defaults;
}

/* ------------------------------------------------------------ slots & states */

function collectSlots(ts, files, program) {
  const slots = [];
  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    sf.forEachChild((node) => {
      if (!ts.isTypeAliasDeclaration(node)) return;
      if (!/Slot$/.test(node.name.text)) return;
      const text = node.type.getText(sf);
      for (const m of text.matchAll(/"([a-zA-Z][\w-]*)"/g)) {
        if (!slots.includes(m[1])) slots.push(m[1]); // declaration order is meaningful
      }
    });
  }
  return slots;
}

/** `data-*` attributes, from the stylesheet's selectors and the JSX that sets them. */
function collectStates(dir) {
  const found = new Map(); // attr -> Set(values)
  const add = (attr, value) => {
    if (!found.has(attr)) found.set(attr, new Set());
    if (value) found.get(attr).add(value);
  };

  const css = path.join(dir, "styles.css");
  if (fs.existsSync(css)) {
    const text = fs.readFileSync(css, "utf8");
    for (const m of text.matchAll(/\[(data-[a-z-]+)(?:=["']([^"']+)["'])?\]/g)) add(m[1], m[2]);
  }
  for (const f of sourceFiles(dir)) {
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(/["']?(data-[a-z-]+)["']?\s*[=:]\s*["']?([a-z-]+)?["']?/g))
      add(m[1], /^[a-z-]+$/.test(m[2] ?? "") ? m[2] : undefined);
  }

  return [...found.entries()]
    .map(([attr, values]) => ({
      attr,
      ...(values.size ? { values: [...values].sort() } : {}),
    }))
    .sort((a, b) => a.attr.localeCompare(b.attr));
}

/* ------------------------------------------------------------------ extract */

/**
 * Derive the generated half of one component's passport.
 * @returns {{passport: object, stats: object}}
 */
/*
 * The component's imperative surface: the members of any exported interface
 * named `*Api` or `*Handle` (GridApi, DatePickerHandle, ComboboxHandle). That
 * is the thing a `ref` hands back, and so the only set an operation's
 * `apiMethod` may name.
 *
 * Collected but not published: v1's schema is out in the world, and an
 * operation naming a method that does not exist is caught either way.
 */
function collectApi(ts, checker, exported, deAlias) {
  const names = new Set();
  for (const raw of exported) {
    if (!/(?:Api|Handle)$/.test(raw.name)) continue;
    const sym = deAlias(raw);
    const decl = (sym.declarations ?? []).find(ts.isInterfaceDeclaration);
    if (!decl) continue;
    for (const member of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(sym))) {
      names.add(member.name);
    }
  }
  return [...names].sort();
}

function extractComponent(ts, program, checker, { name, dir, libRoot, libraryVersion, repoRoot }) {
  const files = sourceFiles(dir);
  const indexFile = path.join(dir, "index.ts");
  const sf = program.getSourceFile(indexFile);
  if (!sf) throw new Error(`${name}: index.ts did not resolve in the program`);

  const moduleSymbol = checker.getSymbolAtLocation(sf);
  if (!moduleSymbol) throw new Error(`${name}: no module symbol for index.ts`);

  const deAlias = (s) => (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
  const exported = checker.getExportsOfModule(moduleSymbol);

  const defaults = collectDefaults(ts, files, program);
  const api = collectApi(ts, checker, exported, deAlias);

  // Pass 1: which exports are actually components?
  const componentExports = [];
  for (const raw of exported) {
    const decls = deAlias(raw).declarations ?? [];
    if (
      /^[A-Z]/.test(raw.name) &&
      decls.some((d) => ts.isFunctionDeclaration(d) || ts.isVariableDeclaration(d))
    ) {
      componentExports.push(raw.name);
    }
  }

  /*
   * Only `<Component>Props` describes a component's public props. Other
   * `*Props` exports are callback payloads — ButtonRenderProps is the argument
   * to `render`, not something you pass to <Button> — and folding them in
   * corrupts the prop list (it made `className` look required).
   */
  const componentPropsNames = new Set(componentExports.map((c) => `${c}Props`));

  const props = new Map(); // name -> entry (first declaration wins)
  const externalBases = new Map(); // baseName -> { from, omitted }
  let inheritedConfirmed = 0;

  for (const raw of exported) {
    const sym = deAlias(raw);
    if (!componentPropsNames.has(raw.name)) continue;
    const decl = (sym.declarations ?? []).find(ts.isInterfaceDeclaration);
    if (!decl) continue;

    // Record external base types as an inheritance edge rather than flattening.
    for (const clause of decl.heritageClauses ?? []) {
      for (const typeNode of clause.types) {
        const text = typeNode.getText(decl.getSourceFile());
        const omitMatch = text.match(/^Omit<\s*([^,]+),\s*(.+)>$/s);
        const inner = omitMatch ? omitMatch[1].trim() : text;
        const omitted = omitMatch
          ? [...omitMatch[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort()
          : [];
        const baseName = inner.replace(/<.*$/s, "").trim();

        const baseType = checker.getTypeAtLocation(typeNode.expression ?? typeNode);
        const baseDecl = baseType?.getSymbol?.()?.declarations?.[0];
        const origin = originOfDeclaration(baseDecl, libRoot);
        if (origin === "inherited") {
          externalBases.set(baseName, { from: inner, omitted, passthrough: true });
        }
      }
    }

    const type = checker.getDeclaredTypeOfSymbol(sym);
    for (const p of checker.getPropertiesOfType(type)) {
      if (props.has(p.name)) continue;
      const pDecl = p.declarations?.[0];
      const origin = originOfDeclaration(pDecl, libRoot);
      if (origin === "inherited") continue; // handled by the allowlist pass below

      const pType = checker.getTypeOfSymbolAtLocation(p, pDecl ?? decl);
      const shape = describeType(ts, checker, pType, pDecl ?? decl);
      const description = jsDocOf(ts, p);
      const required = !(p.flags & ts.SymbolFlags.Optional);

      let def;
      for (const comp of componentExports) {
        if (defaults.has(`${comp}.${p.name}`)) { def = defaults.get(`${comp}.${p.name}`); break; }
      }
      if (def === undefined && defaults.has(`${name}.${p.name}`)) def = defaults.get(`${name}.${p.name}`);

      props.set(p.name, {
        name: p.name,
        ...shape,
        required,
        ...(def !== undefined ? { default: def } : {}),
        origin: origin === "shared" ? "derived" : "derived",
        ...(description ? { description, descriptionOrigin: "jsdoc" } : {}),
      });
    }
  }

  /* --- inherited allowlist: only what the checker confirms actually exists --- */
  const baseNames = [...externalBases.keys()];
  if (baseNames.length) {
    const wanted = allowlistFor(baseNames);
    for (const raw of exported) {
      if (!componentPropsNames.has(raw.name)) continue;
      const sym = deAlias(raw);
      const decl = (sym.declarations ?? []).find(ts.isInterfaceDeclaration);
      if (!decl) continue;
      const type = checker.getDeclaredTypeOfSymbol(sym);

      for (const wantedName of wanted) {
        if (props.has(wantedName)) continue;
        const p = checker.getPropertyOfType(type, wantedName);
        if (!p) continue; // not present -> never emitted
        const pDecl = p.declarations?.[0];
        if (originOfDeclaration(pDecl, libRoot) !== "inherited") continue;

        const pType = checker.getTypeOfSymbolAtLocation(p, pDecl ?? decl);
        const shape = describeType(ts, checker, pType, pDecl ?? decl);
        props.set(wantedName, {
          name: wantedName,
          ...shape,
          required: !(p.flags & ts.SymbolFlags.Optional),
          origin: "inherited",
        });
        inheritedConfirmed++;
      }
    }
  }

  const propList = [...props.values()].sort((a, b) => a.name.localeCompare(b.name));
  const events = propList
    .filter((p) => /^on[A-Z]/.test(p.name))
    .map((p) => ({ name: p.name, ...(p.signature ? { signature: p.signature } : {}) }));

  const described = propList.filter((p) => p.description).length;

  const passport = {
    passportVersion: PASSPORT_VERSION,
    identity: {
      component: componentExports[0] ?? name,
      folder: name,
      exports: componentExports.sort(),
    },
    source: {
      libraryVersion,
      files: files.map((f) => posix(path.relative(dir, f))),
      sourceHash: hashSources([...files, ...(fs.existsSync(path.join(dir, "styles.css")) ? [path.join(dir, "styles.css")] : [])], repoRoot),
    },
    props: propList,
    ...(externalBases.size
      ? { inherits: [...externalBases.values()].sort((a, b) => a.from.localeCompare(b.from)) }
      : {}),
    events,
    slots: collectSlots(ts, files, program),
    states: collectStates(dir),
    accessibility: { supplied: [], required: [] },
    composition: {},
    operations: {},
    intentDomains: [],
    safeMutations: {},
    examples: [],
    coverage: {
      propsTotal: propList.length,
      propsDescribed: described,
      describedPct: propList.length ? Math.round((described / propList.length) * 100) : 0,
      authoredSections: [],
    },
  };

  return {
    passport,
    api,
    stats: {
      component: name,
      props: propList.length,
      own: propList.filter((p) => p.origin === "derived").length,
      inherited: inheritedConfirmed,
      inheritsEdges: externalBases.size,
      events: events.length,
      slots: passport.slots.length,
      states: passport.states.length,
      api: api.length,
      described,
    },
  };
}

module.exports = {
  PASSPORT_VERSION,
  loadTypeScript,
  createProgram,
  extractComponent,
  sourceFiles,
  hashSources,
  posix,
};
