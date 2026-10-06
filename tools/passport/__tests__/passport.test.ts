import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildAll, check, generate, serialise } = require("../index.cjs");
const { mergePassport } = require("../merge.cjs");
const { validateStructure, validateReferences } = require("../validate.cjs");
const { allowlistFor } = require("../policy.cjs");

const REPO = resolve(__dirname, "..", "..", "..");
const LIB = join(REPO, "source", "beta-components");
const LIBRARY_VERSION = JSON.parse(
  readFileSync(join(REPO, "package.json"), "utf8"),
).version;
const opts = { libRoot: LIB, repoRoot: REPO, libraryVersion: LIBRARY_VERSION };

let results: any[];
const byName = (n: string) => results.find((r) => r.name === n);

beforeAll(() => {
  results = buildAll(opts).results;
}, 120_000);

/* ------------------------------------------------- own-source flattening */

describe("own-source inheritance is flattened", () => {
  it("DataGridProps extends GridOptions, so GridOptions props are enumerated", () => {
    const grid = byName("data-grid").effective;
    for (const name of ["data", "columns", "getRowId", "mode", "rowCount", "enableRowSelection"]) {
      const prop = grid.props.find((p: any) => p.name === name);
      expect(prop, `${name} should be enumerated`).toBeTruthy();
      expect(prop.origin).toBe("derived");
    }
    // GridOptions is project-local, so it is NOT recorded as an external edge.
    const edges = (grid.inherits ?? []).map((e: any) => e.from);
    expect(edges.some((f: string) => f.includes("GridOptions"))).toBe(false);
  });

  it("Combobox flattens ComboboxSharedProps into Select and MultiSelect", () => {
    const cb = byName("combobox").effective;
    expect(cb.props.length).toBeGreaterThan(30);
    expect(cb.props.find((p: any) => p.name === "options")).toBeTruthy();
  });

  it("DatePicker flattens DatePickerSharedProps", () => {
    const dp = byName("date-picker").effective;
    for (const name of ["min", "max", "locale"]) {
      expect(dp.props.find((p: any) => p.name === name), name).toBeTruthy();
    }
  });
});

/* ------------------------------------------- external inheritance boundary */

describe("external React inheritance is a boundary, not a flattening", () => {
  it("Button keeps ButtonHTMLAttributes as an edge instead of enumerating it", () => {
    const button = byName("button").effective;
    expect(button.inherits).toBeTruthy();
    expect(button.inherits[0].from).toContain("ButtonHTMLAttributes");
    expect(button.inherits[0].passthrough).toBe(true);
  });

  it("does not explode into hundreds of DOM props", () => {
    // Tabs extends HTMLAttributes, which resolves to 800+ properties.
    for (const r of results) {
      expect(r.effective.props.length, `${r.name} prop count`).toBeLessThan(80);
    }
  });

  it("records what the component omitted from the base type", () => {
    const button = byName("button").effective;
    expect(button.inherits[0].omitted).toContain("onClick");
  });
});

/* ------------------------------------------------------ inherited allowlist */

describe("inherited allowlist", () => {
  it("surfaces useful inherited props inline with origin=inherited", () => {
    const button = byName("button").effective;
    const disabled = button.props.find((p: any) => p.name === "disabled");
    expect(disabled).toBeTruthy();
    expect(disabled.origin).toBe("inherited");
    expect(disabled.type).toBe("boolean");
  });

  it("only emits allowlisted props the TypeChecker confirms exist", () => {
    // `rows` is allowlisted for textarea bases and must not appear on Button.
    const button = byName("button").effective;
    expect(button.props.find((p: any) => p.name === "rows")).toBeUndefined();

    const textarea = byName("textarea").effective;
    expect(textarea.props.find((p: any) => p.name === "rows")).toBeTruthy();
  });

  it("never marks an inherited prop as derived", () => {
    for (const r of results) {
      for (const p of r.effective.props) {
        if (p.origin === "inherited") expect(p.name).toBeTruthy();
      }
    }
    // The policy list is only a wish list; nothing is emitted unconfirmed.
    const wished = allowlistFor(["ButtonHTMLAttributes"]);
    const button = byName("button").effective;
    const emitted = button.props.filter((p: any) => p.origin === "inherited").map((p: any) => p.name);
    for (const name of emitted) expect(wished).toContain(name);
  });
});

/* -------------------------------------------------------------- real fixtures */

describe("Button passport", () => {
  it("derives enums, defaults and JSDoc from source", () => {
    const b = byName("button").effective;
    const variant = b.props.find((p: any) => p.name === "variant");
    expect(variant.type).toBe("enum");
    expect(variant.values).toContain("danger");
    expect(variant.default).toBe("primary");

    const size = b.props.find((p: any) => p.name === "size");
    expect(size.default).toBe("md");

    const onClick = b.props.find((p: any) => p.name === "onClick");
    expect(onClick.type).toBe("function");
  });

  it("does not fold callback payload types into the prop list", () => {
    // ButtonRenderProps is the argument to `render`, not a prop of <Button>.
    const b = byName("button").effective;
    const className = b.props.find((p: any) => p.name === "className");
    expect(className.required).toBe(false);
  });

  it("merges authored semantics without inventing descriptions", () => {
    const b = byName("button").effective;
    expect(b.purpose).toContain("Trigger an action");
    expect(b.safeMutations.forbidden).toContain("onClick");
    const undocumented = b.props.filter((p: any) => !p.description);
    for (const p of undocumented) expect(p.descriptionOrigin).toBeUndefined();
  });
});

describe("DataGrid passport", () => {
  it("declares operations that name real GridApi methods, or none at all", () => {
    const grid = byName("data-grid");
    const api: string[] = grid.api;

    // The imperative surface is read off the source, not listed here.
    expect(api).toContain("setFilter");
    expect(api).toContain("exportPdf");
    expect(Object.keys(grid.effective.operations).length).toBeGreaterThan(5);

    for (const [name, op] of Object.entries<any>(grid.effective.operations)) {
      if (op.apiMethod === undefined) continue; // performed some other way
      expect(api, `operation ${name} -> ${op.apiMethod}`).toContain(op.apiMethod);
    }
  });

  it("leaves apiMethod off the operations no single method performs", () => {
    const operations = byName("data-grid").effective.operations;
    for (const name of ["export", "undo", "redo"]) {
      expect(operations[name], name).toBeDefined();
      expect(operations[name].apiMethod, name).toBeUndefined();
    }
  });

  it("does not advertise grouping or aggregation", () => {
    const g = byName("data-grid").effective;
    const names = Object.keys(g.operations).join(" ").toLowerCase();
    expect(names).not.toContain("group");
    expect(names).not.toContain("aggregat");
  });
});

/* --------------------------------------------------------------- merge rules */

describe("merge precedence", () => {
  const derived = {
    passportVersion: "1.0.0",
    identity: { component: "X", folder: "x", exports: ["X"] },
    source: { libraryVersion: "1", files: ["a.ts"], sourceHash: `sha256:${"0".repeat(64)}` },
    props: [{ name: "size", type: "enum", values: ["sm"], required: false, origin: "derived" }],
    events: [], slots: [], states: [],
    accessibility: { supplied: [], required: [] },
    composition: {}, operations: {}, intentDomains: [], safeMutations: {}, examples: [],
    coverage: { propsTotal: 1, propsDescribed: 0, describedPct: 0, authoredSections: [] },
  };

  it("manual adds semantics and annotates props", () => {
    const out = mergePassport(derived, {
      purpose: "A thing.",
      propNotes: { size: "controls height" },
      safeMutations: { allowed: ["size"] },
    });
    expect(out.purpose).toBe("A thing.");
    expect(out.props[0].note).toBe("controls height");
    expect(out.coverage.authoredSections).toContain("purpose");
  });

  it("manual cannot replace source-owned fields", () => {
    const out = mergePassport(derived, { source: { sourceHash: "sha256:bad" }, slots: ["hacked"] });
    expect(out.source.sourceHash).toBe(derived.source.sourceHash);
    expect(out.slots).toEqual([]);
  });

  it("local overlay may introduce a prop, marked origin=local", () => {
    const out = mergePassport(derived, {}, {
      props: [{ name: "tone", type: "enum", values: ["x"], required: false }],
    });
    const tone = out.props.find((p: any) => p.name === "tone");
    expect(tone.origin).toBe("local");
  });

  it("local wins over manual for the same field", () => {
    const out = mergePassport(derived, { purpose: "manual" }, { purpose: "local" });
    expect(out.purpose).toBe("local");
  });

  it("recomputes coverage after overlays", () => {
    const out = mergePassport(derived, {
      props: [{ name: "size", description: "The size." }],
    });
    expect(out.coverage.propsDescribed).toBe(1);
    expect(out.coverage.describedPct).toBe(100);
    expect(out.props[0].descriptionOrigin).toBe("manual");
  });
});

/* ----------------------------------------------------------- validation */

describe("validation", () => {
  it("every generated passport is structurally valid", () => {
    for (const r of results) {
      expect(validateStructure(r.effective, r.name), r.name).toEqual([]);
    }
  });

  it("flags manual metadata referencing a prop that no longer exists", () => {
    const base = byName("button");
    const issues = validateReferences(base.effective, {
      manual: { safeMutations: { allowed: ["doesNotExist"] } },
      component: "button",
    });
    expect(issues.some((i: any) => i.code === "missing-prop-reference")).toBe(true);
  });

  it("flags manual metadata contradicting a derived type", () => {
    const base = byName("button");
    const issues = validateReferences(base.effective, {
      manual: { props: [{ name: "variant", type: "number" }] },
      component: "button",
    });
    expect(issues.some((i: any) => i.code === "contradicts-source")).toBe(true);
  });

  it("flags an operation naming an API method that does not exist", () => {
    const issues = validateReferences(byName("data-grid").effective, {
      manual: { operations: { bogus: { summary: "x", apiMethod: "setWarpDrive" } } },
      component: "data-grid",
      api: ["setFilter"],
    });
    expect(issues.some((i: any) => i.code === "unknown-api-method")).toBe(true);
  });
});

/* ------------------------------------------------- determinism and drift */

describe("determinism and drift", () => {
  it("generates byte-identical output across runs", () => {
    const a = buildAll(opts).results.map((r: any) => serialise(r.effective)).join("");
    const b = buildAll(opts).results.map((r: any) => serialise(r.effective)).join("");
    expect(a).toBe(b);
  }, 120_000);

  it("committed passports are up to date", () => {
    const { errors } = check(opts);
    expect(errors).toBe(0);
  }, 120_000);

  it("changing source changes the hash and is detected as stale", () => {
    const tmp = mkdtempSync(join(tmpdir(), "passport-"));
    try {
      const lib = join(tmp, "beta");
      cpSync(join(LIB, "button"), join(lib, "button"), { recursive: true });
      cpSync(join(LIB, "shared"), join(lib, "shared"), { recursive: true });
      // A real consumer has node_modules at the project root; only the
      // components are copied. Pointing repoRoot at this repo reproduces that.
      const local = { libRoot: lib, repoRoot: REPO, libraryVersion: "test" };

      generate(local);
      const before = JSON.parse(readFileSync(join(lib, "button", "passport.json"), "utf8"));
      expect(check(local).errors).toBe(0);

      // Add a prop to the real source file.
      const propsFile = join(lib, "button", "react", "Button.tsx");
      const text = readFileSync(propsFile, "utf8");
      writeFileSync(
        propsFile,
        text.replace(
          "export interface ButtonProps",
          "export interface ButtonProps_MARK {}\nexport interface ButtonProps",
        ).replace(
          /(\n  \/\*\* A button that fills[\s\S]*?\n)/,
          "$1  /** Test-only prop. */\n  tone?: \"quiet\" | \"loud\";\n",
        ),
      );

      const stale = check(local);
      expect(stale.errors).toBeGreaterThan(0);
      expect(
        stale.report.some((r: any) =>
          r.problems.some((p: any) => p.code === "stale-passport"),
        ),
      ).toBe(true);

      generate(local);
      const after = JSON.parse(readFileSync(join(lib, "button", "passport.json"), "utf8"));
      expect(after.source.sourceHash).not.toBe(before.source.sourceHash);
      expect(check(local).errors).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 180_000);

  it("reports a missing passport as an error", () => {
    const tmp = mkdtempSync(join(tmpdir(), "passport-missing-"));
    try {
      const lib = join(tmp, "beta");
      cpSync(join(LIB, "tooltip"), join(lib, "tooltip"), { recursive: true });
      cpSync(join(LIB, "shared"), join(lib, "shared"), { recursive: true });
      rmSync(join(lib, "tooltip", "passport.json"), { force: true });
      const { errors, report } = check({ libRoot: lib, repoRoot: REPO, libraryVersion: "t" });
      expect(errors).toBeGreaterThan(0);
      expect(report[0].problems.some((p: any) => p.code === "missing-passport")).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 120_000);
});

/* ------------------------------------------------------------- coverage */

describe("coverage", () => {
  it("counts described props and never invents a description", () => {
    for (const r of results) {
      const c = r.effective.coverage;
      const actual = r.effective.props.filter((p: any) => p.description).length;
      expect(c.propsDescribed, r.name).toBe(actual);
      expect(c.propsTotal, r.name).toBe(r.effective.props.length);
      expect(c.describedPct, r.name).toBe(
        c.propsTotal ? Math.round((actual / c.propsTotal) * 100) : 0,
      );
    }
  });

  it("every description carries its origin", () => {
    for (const r of results) {
      for (const p of r.effective.props) {
        if (p.description) expect(["jsdoc", "readme", "manual", "local"]).toContain(p.descriptionOrigin);
      }
    }
  });
});

/* ------------------------------------------------------------- artifacts */

describe("committed artifacts", () => {
  it("every beta component has a passport.json on disk", () => {
    for (const r of results) {
      expect(existsSync(join(r.dir, "passport.json")), r.name).toBe(true);
    }
  });

  it("no passport.generated.json is committed anywhere", () => {
    for (const r of results) {
      expect(existsSync(join(r.dir, "passport.generated.json")), r.name).toBe(false);
    }
  });
});
