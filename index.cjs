#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const readline = require("readline");

// Configuration
const CONFIG = {
  components: [
    "Card",
    "Select",
    "SideBar",
    "MultiSelect",
    "Button",
    "DatePicker",
    "Checkbox",
    "DarkMode",
    "Dialog",
    "Input",
    "Modal",
    "Spinner",
    "Toast",
    "Tabs",
    "Uploader",
    "FormRenderer",
    "MaterialInput",
    "TextArea",
    "ContextMenu",
    "Navbar",
    "DataGrid",
    "BreadCrumb",
    "Bargraph",
    "UsePaginatedData",
    "UseUploader",
  ],
  betaComponents: [
    "DataGrid",
    "Combobox",
    "DatePicker",
    "Toaster",
    "FileUploader",
    "Dialog",
    "Input",
    "Modal",
    "Textarea",
    "Button",
    "Breadcrumb",
    "Checkbox",
    "Tabs",
    "Spinner",
    "Menu",
    "Tooltip",
    "Popover",
    "Card",
    "Skeleton",
    "NumberInput",
    "RadioGroup",
    "Switch",
    "Accordion",
    "Alert",
    "Avatar",
    "Badge",
    "Progress",
  ],
  // Beta folder names that are not simply the lowercased component name.
  betaFolders: {
    DataGrid: "data-grid",
    DatePicker: "date-picker",
    FileUploader: "file-uploader",
    NumberInput: "number-input",
    RadioGroup: "radio-group",
  },
  // Define component dependencies
  dependencies: {
    FormRenderer: ["Select", "MultiSelect", "Input", "DatePicker"],
  },
  docs: "https://gramprokit.vercel.app/",
};

const { version: PACKAGE_VERSION } = require("./package.json");

const SOURCE_PATH = path.join(__dirname, "source", "components");
const BETA_SOURCE_PATH = path.join(__dirname, "source", "beta-components");
const DEFAULT_DEST_PATH = path.join(process.cwd(), "component-lib");

/**
 * The agent skill. It teaches a coding agent how to use these components, so it
 * belongs at the root of the project being worked on, not in component-lib.
 */
const SKILL_SOURCE_PATH = path.join(__dirname, ".gbs");
const SKILL_DEST_DIR = ".gbs";
const SKILL_NAME = "gbs-components";

/** Where SKILL.md and references/ live inside the package. */
const SKILL_SRC_DIR = path.join(
  SKILL_SOURCE_PATH,
  "skills",
  SKILL_NAME,
);

/**
 * Agents we can write a copy of the skill for. Each looks in its own place and
 * none of them reads `.gbs`, which stays the canonical copy either way.
 */
const SKILL_TARGETS = ["claude", "codex", "antigravity"];

/** Codex reads one always-on file the project usually maintains by hand, so we
 *  own a marked block inside it and never touch a line outside. */
const AGENTS_FILE = "AGENTS.md";
const BLOCK_START = "<!-- gbs-add-block:start -->";
const BLOCK_END = "<!-- gbs-add-block:end -->";

/** Newline, named so long template literals stay readable. */
const NL = String.fromCharCode(10);

/**
 * Every beta component imports its shared helpers from `../../shared`, so this
 * folder is installed alongside whatever the user picked. It is not a component
 * and never appears in the component list.
 */
const SHARED_DIR = "shared";
const MANIFEST_FILE = ".install-manifest.json";

/**
 * Tests belong to this repo, not to the projects we install into: they import
 * vitest, which the project has no reason to have, and the shared folder's
 * boundary tests would run against whatever else is in the user's
 * component-lib.
 */
const TESTS_DIR = "__tests__";
const isTestPath = (filePath) => filePath.split(/[\\/]/).includes(TESTS_DIR);

const normalizeComponent = (component, availableComponents) =>
  availableComponents.find(
    (available) => available.toLowerCase() === component.toLowerCase(),
  );

const getAvailableComponents = (beta = false) =>
  beta ? CONFIG.betaComponents : CONFIG.components;

const getSourcePath = (beta = false) => (beta ? BETA_SOURCE_PATH : SOURCE_PATH);

/** The folder a component lives in, which is not always its lowercased name. */
const folderFor = (component, beta = false) =>
  (beta && CONFIG.betaFolders[component]) || component.toLowerCase();

const copyCommonFiles = async (destPath) => {
  const commonFiles = [
    { src: ["..", "utils.ts"], dest: "utils.ts" },
    { src: ["..", "globalStyle.ts"], dest: "globalStyle.ts" },
    { src: ["..", "theme.ts"], dest: "theme.ts" },
    { src: ["..", "icon"], dest: "icon" },
  ];

  for (const file of commonFiles) {
    const src = path.join(SOURCE_PATH, ...file.src);
    const dest = path.join(destPath, file.dest);
    await fs.copy(src, dest, { overwrite: true });
    console.log(`✓ ${file.dest} copied successfully`);
  }
};

/* ------------------------------------------------------------ shared folder */

const sha256 = (filePath) =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

/** Every file under a directory, relative to it, with "/" separators. */
const listFiles = (dir, prefix = "") =>
  fs
    .readdirSync(path.join(dir, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.name === MANIFEST_FILE || entry.name === TESTS_DIR) return [];
      return entry.isDirectory() ? listFiles(dir, relative) : [relative];
    });

/** -1, 0 or 1, comparing dotted numeric versions such as "1.2.0". */
const compareVersions = (a, b) => {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
};

const readJson = (filePath, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

/** Files the manifest says we wrote, whose contents have since changed. */
const locallyEdited = (dest, manifest) =>
  !manifest
    ? []
    : Object.keys(manifest.files).filter((file) => {
        const target = path.join(dest, file);
        return fs.existsSync(target) && manifest.files[file] !== sha256(target);
      });

/**
 * Installs or updates `shared/`.
 *
 * Because components are copied into a project one at a time, a project can end
 * up with components built against different versions of this folder. The rules
 * are that `shared/` only ever moves forward, and that a file the user has
 * edited since we wrote it is never replaced without `--force`.
 */
const installShared = async (destPath, { force = false } = {}) => {
  const src = path.join(BETA_SOURCE_PATH, SHARED_DIR);
  const dest = path.join(destPath, SHARED_DIR);

  if (!fs.existsSync(src)) {
    throw new Error(
      `The shared folder is missing from ${BETA_SOURCE_PATH}. Beta components cannot be installed without it.`,
    );
  }

  const srcVersion =
    (readJson(path.join(src, "version.json"), {}) || {}).version || "0.0.0";
  const manifest = readJson(path.join(dest, MANIFEST_FILE));
  const installedVersion = manifest ? manifest.version : null;
  const edited = locallyEdited(dest, manifest);

  if (installedVersion && !force) {
    const order = compareVersions(installedVersion, srcVersion);

    if (order > 0) {
      console.error(
        `\n✗ This project has shared v${installedVersion}, newer than the v${srcVersion} in this installer.`,
      );
      console.error(
        "  Installing it would downgrade the folder and break the components already here.",
      );
      console.error(
        "  Update the CLI, or re-run with --force to overwrite it anyway.",
      );
      process.exit(1);
    }

    if (order === 0) {
      console.log(
        edited.length > 0
          ? `✓ shared v${installedVersion} is already installed (keeping your ${edited.length} edited file(s))`
          : `✓ shared v${installedVersion} is already installed`,
      );
      return;
    }
  }

  if (edited.length > 0 && !force) {
    console.error(
      `\n✗ These files in component-lib/${SHARED_DIR} have local changes:`,
    );
    edited.forEach((file) => console.error(`  - ${file}`));
    console.error(
      "\n  Updating shared/ would replace them. Re-run with --force to do that, or move",
    );
    console.error(
      "  your changes into your own module first: components are yours to edit,",
    );
    console.error("  shared/ is replaced on every update.");
    process.exit(1);
  }

  const files = listFiles(src);
  for (const file of files) {
    await fs.copy(path.join(src, file), path.join(dest, file), {
      overwrite: true,
    });
  }

  // Remove what an older version left behind, but only files we installed and
  // the user has not since changed.
  if (manifest) {
    const removed = Object.keys(manifest.files).filter(
      (file) => !files.includes(file),
    );
    for (const file of removed) {
      const target = path.join(dest, file);
      if (
        fs.existsSync(target) &&
        (force || manifest.files[file] === sha256(target))
      ) {
        await fs.remove(target);
      }
    }
  }

  fs.writeJsonSync(
    path.join(dest, MANIFEST_FILE),
    {
      version: srcVersion,
      installedAt: new Date().toISOString(),
      files: Object.fromEntries(
        files.map((file) => [file, sha256(path.join(src, file))]),
      ),
    },
    { spaces: 2 },
  );

  console.log(
    installedVersion
      ? `✓ shared updated ${installedVersion} → ${srcVersion}`
      : `✓ shared v${srcVersion} installed`,
  );
};

/* --------------------------------------------------------------- the skill */

/** Posix-style path, so manifest keys read the same on every platform. */
const rel = (...parts) => parts.join("/");

/**
 * Removes directories a removal left empty, up to but not including `root`.
 *
 * Only ever removes an empty directory, so a `.claude` folder that also holds
 * the project's own settings survives having our skill taken out of it.
 */
const pruneEmptyDirs = async (root, from) => {
  const stop = path.resolve(root);
  let dir = path.dirname(path.resolve(root, from));

  while (dir !== stop && dir.startsWith(stop)) {
    if (!fs.existsSync(dir) || fs.readdirSync(dir).length > 0) return;
    await fs.remove(dir);
    dir = path.dirname(dir);
  }
};

/** Splits `---` front matter from the body of a markdown document. */
const parseSkillDoc = (file) => {
  const text = fs.readFileSync(file, "utf8").split("\r\n").join(NL);
  const opener = "---" + NL;
  if (!text.startsWith(opener)) return { frontMatter: "", body: text };

  const marker = NL + "---" + NL;
  const close = text.indexOf(marker, opener.length);
  if (close === -1) return { frontMatter: "", body: text };

  return {
    frontMatter: text.slice(opener.length, close),
    body: text.slice(close + marker.length),
  };
};

/** One `key: value` line out of front matter we wrote ourselves. */
const frontMatterField = (frontMatter, key) => {
  const prefix = key + ":";
  const line = frontMatter.split(NL).find((item) => item.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
};

/**
 * Claude Code: a full skill folder, references included, since it reads files
 * bundled beside SKILL.md. Only the front matter changes — it spells the glob
 * list `paths` where the GBS agent spells it `autoAttach`.
 */
const writeClaudeSkill = async (root) => {
  const base = rel(".claude", "skills", SKILL_NAME);
  const written = [];

  for (const file of listFiles(SKILL_SRC_DIR)) {
    const from = path.join(SKILL_SRC_DIR, file);
    const to = path.join(root, base, file);

    if (file === "SKILL.md") {
      const { frontMatter, body } = parseSkillDoc(from);
      const globs = frontMatterField(frontMatter, "autoAttach");
      const lines = [
        "---",
        "name: " + (frontMatterField(frontMatter, "name") || SKILL_NAME),
        "description: " + frontMatterField(frontMatter, "description"),
      ];
      // Claude Code spells the glob list `paths`; the GBS agent spells it `autoAttach`.
      if (globs) lines.push("paths: " + globs);
      lines.push("---");

      // `body` keeps the blank line that followed the original front matter.
      await fs.outputFile(to, lines.join(NL) + NL + body);
    } else {
      await fs.copy(from, to, { overwrite: true });
    }

    written.push(rel(base, file));
  }

  return written;
};

/**
 * Antigravity: one markdown rule, well inside its 12,000 character limit. Its
 * glob activation is set on the rule in the IDE rather than in the file, so the
 * globs are stated in the text for whoever configures it.
 */
const writeAntigravityRule = async (root) => {
  const { frontMatter, body } = parseSkillDoc(
    path.join(SKILL_SRC_DIR, "SKILL.md"),
  );
  const target = rel(".agents", "rules", SKILL_NAME + ".md");

  const preamble = [
    "> Applies to React UI files: " +
      (frontMatterField(frontMatter, "autoAttach") || "src/**/*.tsx") +
      ".",
    "> Set that as this rule's glob if you want it attached automatically.",
    "> Deeper reference files live in " +
      rel(SKILL_DEST_DIR, "skills", SKILL_NAME, "references") +
      "/.",
    "",
  ].join(NL);

  await fs.outputFile(path.join(root, target), preamble + body);
  return [target];
};

/**
 * Codex: a pointer in AGENTS.md rather than the skill itself, because that file
 * is always in context and the skill is 5 KB. Everything outside our markers is
 * left exactly as it was.
 */
const writeAgentsPointer = async (root) => {
  const file = path.join(root, AGENTS_FILE);
  const skillPath = rel(SKILL_DEST_DIR, "skills", SKILL_NAME, "SKILL.md");

  const block = [
    BLOCK_START,
    "",
    "## GBS components",
    "",
    "This project uses the GBS headless component library. Before adding or",
    "changing UI, read `" + skillPath + "` and follow it.",
    "",
    "It covers the import rule (components are copied into `component-lib/`, not",
    "imported from a package), the change-handler name each component uses, and",
    "the props that do not exist. Deeper detail is in the `references/` folder",
    "beside it — open the one the task needs.",
    "",
    BLOCK_END,
  ].join(NL);

  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  let next;

  if (existing.includes(BLOCK_START) && existing.includes(BLOCK_END)) {
    next =
      existing.slice(0, existing.indexOf(BLOCK_START)) +
      block +
      existing.slice(existing.indexOf(BLOCK_END) + BLOCK_END.length);
  } else if (existing.trim()) {
    next = existing.replace(/\s+$/, "") + NL + NL + block + NL;
  } else {
    next = "# AGENTS.md" + NL + NL + block + NL;
  }

  await fs.outputFile(file, next);
  return existing.includes(BLOCK_START) ? "updated" : "added";
};

/**
 * Installs or updates the skill at the project root.
 *
 * `.gbs/` is always written: it is the canonical copy and the one the GBS agent
 * reads. The other agents each look somewhere else, so they get an adapter
 * generated from the same source rather than a second copy to maintain.
 *
 * Everything we write is tracked by sha256 in one manifest, so a file the user
 * has edited is never replaced without `--force`. AGENTS.md is the exception:
 * the project owns that file, and we only rewrite our own marked block.
 */
const installSkill = async (
  destRoot,
  { force = false, targets = SKILL_TARGETS } = {},
) => {
  const src = SKILL_SOURCE_PATH;

  if (!fs.existsSync(src)) {
    throw new Error(
      `The skill is missing from ${src}. Update the CLI and try again.`,
    );
  }

  const manifestPath = path.join(destRoot, SKILL_DEST_DIR, MANIFEST_FILE);
  const manifest = readJson(manifestPath);
  const installedVersion = manifest ? manifest.version : null;
  const edited = locallyEdited(destRoot, manifest);

  if (edited.length > 0 && !force) {
    console.error(`${NL}✗ These skill files have local changes:`);
    edited.forEach((file) => console.error(`  - ${file}`));
    console.error(
      NL +
        "  Updating the skill would replace them. Re-run with --force to do that,",
    );
    console.error(
      "  or move your own guidance into a separate skill folder first.",
    );
    process.exit(1);
  }

  // The canonical copy.
  const written = [];
  for (const file of listFiles(src)) {
    await fs.copy(path.join(src, file), path.join(destRoot, SKILL_DEST_DIR, file), {
      overwrite: true,
    });
    written.push(rel(SKILL_DEST_DIR, file));
  }

  // One adapter per agent that looks somewhere else.
  if (targets.includes("claude")) {
    written.push(...(await writeClaudeSkill(destRoot)));
  }
  if (targets.includes("antigravity")) {
    written.push(...(await writeAntigravityRule(destRoot)));
  }
  const agents = targets.includes("codex")
    ? await writeAgentsPointer(destRoot)
    : null;

  // Drop what an older version left behind, but only files we installed and
  // the user has not since changed.
  if (manifest) {
    const removed = Object.keys(manifest.files).filter(
      (file) => !written.includes(file),
    );
    for (const file of removed) {
      const target = path.join(destRoot, file);
      if (
        fs.existsSync(target) &&
        (force || manifest.files[file] === sha256(target))
      ) {
        await fs.remove(target);
        await pruneEmptyDirs(destRoot, file);
      }
    }
  }

  fs.writeJsonSync(
    manifestPath,
    {
      version: PACKAGE_VERSION,
      installedAt: new Date().toISOString(),
      targets,
      // Hashed after writing, because the adapters are generated rather than copied.
      files: Object.fromEntries(
        written.map((file) => [file, sha256(path.join(destRoot, file))]),
      ),
    },
    { spaces: 2 },
  );

  console.log(
    installedVersion
      ? `✓ skill updated ${installedVersion} → ${PACKAGE_VERSION}`
      : `✓ skill v${PACKAGE_VERSION} installed`,
  );
  console.log(`  ${SKILL_DEST_DIR}/ (canonical, ${listFiles(src).length} files)`);
  if (targets.includes("claude")) {
    console.log(`  .claude/skills/${SKILL_NAME}/ for Claude Code`);
  }
  if (targets.includes("antigravity")) {
    console.log(`  .agents/rules/${SKILL_NAME}.md for Antigravity`);
  }
  if (agents) {
    console.log(`  ${AGENTS_FILE} block ${agents}, for Codex`);
  }
  console.log("  Commit them so the whole team's agents pick this up.");
};

/** `--for claude,codex` picks the adapters; `none` writes only `.gbs/`. */
const parseSkillTargets = (value) => {
  if (value === undefined || value === null || value === "") {
    return SKILL_TARGETS;
  }

  const wanted = String(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (wanted.includes("none")) return [];

  const unknown = wanted.filter((item) => !SKILL_TARGETS.includes(item));
  if (unknown.length > 0) {
    console.error(
      `Unknown --for target(s): ${unknown.join(", ")}. Valid: ${SKILL_TARGETS.join(", ")}, none.`,
    );
    process.exit(1);
  }

  return wanted;
};

/** `-a skill` is accepted as well as `--skill`, since both read naturally. */
const isSkillWord = (value) =>
  typeof value === "string" && value.trim().toLowerCase() === "skill";

/** The files a component needs beside it, which differ between the two sets. */
const copySupportFiles = async (destPath, beta, options) => {
  if (beta) {
    await installShared(destPath, options);
    return;
  }
  // The legacy components' common files. Beta components use none of them.
  if (!fs.existsSync(path.join(destPath, "utils.ts"))) {
    await copyCommonFiles(destPath);
  }
};

/* -------------------------------------------------------------- components */

const checkComponentExists = (component, destPath, beta = false) => {
  const componentPath = path.join(destPath, folderFor(component, beta));
  return fs.existsSync(componentPath);
};

const copyComponent = async (component, destPath, beta = false) => {
  try {
    const componentSrc = path.join(
      getSourcePath(beta),
      folderFor(component, beta),
    );
    const componentDest = path.join(destPath, folderFor(component, beta));

    if (!fs.existsSync(componentSrc)) {
      throw new Error(
        `Component ${component} not found in ${beta ? "beta " : ""}source directory.`,
      );
    }

    await fs.copy(componentSrc, componentDest, {
      overwrite: true,
      filter: (source) => !isTestPath(path.relative(componentSrc, source)),
    });
    console.log(
      `✓ Component ${component} installed successfully ${
        component === "Grid"
          ? "This Version of Grid will be deprecated soon. Please Install The New Data Grid Component"
          : ""
      }`,
    );
  } catch (error) {
    console.error(`Error installing component ${component}:`, error.message);
    process.exit(1);
  }
};

const installComponentWithDependencies = async (
  component,
  destPath,
  beta = false,
) => {
  // Get dependencies for the component
  const dependencies = CONFIG.dependencies[component] || [];
  const componentsToInstall = new Set([component, ...dependencies]);

  // Check which components need to be installed
  const pendingInstalls = beta
    ? Array.from(componentsToInstall)
    : Array.from(componentsToInstall).filter(
        (comp) => !checkComponentExists(comp, destPath, beta),
      );

  if (pendingInstalls.length === 0) {
    console.log(
      `✓ ${component} and all its dependencies are already installed.`,
    );
    return;
  }

  // Install all pending components
  for (const comp of pendingInstalls) {
    await copyComponent(comp, destPath, beta);
  }

  if (dependencies.length > 0) {
    console.log(`\nInstalled dependencies for ${component}:`);
    dependencies.forEach((dep) => {
      console.log(`- ${dep}`);
    });
  }

  console.log(`\nFor documentation visit: ${CONFIG.docs}`);
};

const installMultipleComponents = async (
  components,
  destPath,
  beta = false,
) => {
  const allComponentsToInstall = new Set();

  // Collect all components and their dependencies
  components.forEach((component) => {
    const dependencies = CONFIG.dependencies[component] || [];
    allComponentsToInstall.add(component);
    dependencies.forEach((dep) => allComponentsToInstall.add(dep));
  });

  // Filter out already installed components
  const pendingInstalls = beta
    ? Array.from(allComponentsToInstall)
    : Array.from(allComponentsToInstall).filter(
        (comp) => !checkComponentExists(comp, destPath, beta),
      );

  if (pendingInstalls.length === 0) {
    console.log(
      "✓ All selected components and their dependencies are already installed.",
    );
    return;
  }

  console.log(`\nInstalling ${pendingInstalls.length} components...`);

  // Install all pending components
  for (const comp of pendingInstalls) {
    await copyComponent(comp, destPath, beta);
  }

  // Show dependency information
  const allDependencies = new Set();
  components.forEach((component) => {
    const dependencies = CONFIG.dependencies[component] || [];
    dependencies.forEach((dep) => allDependencies.add(dep));
  });

  if (allDependencies.size > 0) {
    console.log(`\nDependencies installed:`);
    Array.from(allDependencies).forEach((dep) => {
      console.log(`- ${dep}`);
    });
  }

  console.log(`\nFor documentation visit: ${CONFIG.docs}`);
};

const interactiveComponentSelector = async (beta = false) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let selectedComponents = new Set();
    let currentIndex = 0;

    const renderMenu = () => {
      console.clear();
      console.log("🚀 Component Installer - Interactive Mode");
      console.log(
        "Use ↑/↓ arrow keys to navigate, SPACE to select/deselect, ENTER to install\n",
      );

      const availableComponents = getAvailableComponents(beta);

      availableComponents.forEach((component, index) => {
        const isSelected = selectedComponents.has(component);
        const isCurrentIndex = index === currentIndex;
        const deps = CONFIG.dependencies[component]
          ? ` (requires: ${CONFIG.dependencies[component].join(", ")})`
          : "";

        const prefix = isCurrentIndex ? ">" : " ";
        const checkbox = isSelected ? "☑" : "☐";
        const line = `${prefix} ${checkbox} ${component}${deps}`;

        if (isCurrentIndex) {
          console.log(`\x1b[36m${line}\x1b[0m`); // Cyan highlight
        } else {
          console.log(line);
        }
      });

      console.log(`\nSelected: ${selectedComponents.size} components`);
      console.log("Press ENTER to install selected components, or 'q' to quit");
    };

    const handleKeyPress = (key) => {
      switch (key) {
        case "[A": // Up arrow
          currentIndex = Math.max(0, currentIndex - 1);
          renderMenu();
          break;
        case "[B": // Down arrow
          currentIndex = Math.min(
            getAvailableComponents(beta).length - 1,
            currentIndex + 1,
          );
          renderMenu();
          break;
        case " ": // Space bar
          const component = getAvailableComponents(beta)[currentIndex];
          if (selectedComponents.has(component)) {
            selectedComponents.delete(component);
          } else {
            selectedComponents.add(component);
          }
          renderMenu();
          break;
        case "\r": // Enter
          if (selectedComponents.size > 0) {
            rl.close();
            resolve(Array.from(selectedComponents));
          }
          break;
        case "q":
          rl.close();
          resolve([]);
          break;
      }
    };

    // Enable raw mode to capture arrow keys
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", handleKeyPress);

    renderMenu();

    rl.on("close", () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    });
  });
};

const parseMultipleComponents = (componentString) => {
  return componentString
    .split(",")
    .map((comp) => comp.trim())
    .filter((comp) => comp.length > 0);
};

const validateComponents = (components, beta = false) => {
  const availableComponents = getAvailableComponents(beta);
  const invalidComponents = components.filter(
    (comp) => !availableComponents.includes(comp),
  );
  if (invalidComponents.length > 0) {
    if (invalidComponents.some((comp) => comp.toLowerCase() === SHARED_DIR)) {
      console.error(
        "`shared` is not a component: it is installed automatically with any beta component.",
      );
    }
    console.error(`Invalid components: ${invalidComponents.join(", ")}`);
    console.log(`\nAvailable ${beta ? "beta " : ""}components:`);
    availableComponents.forEach((comp) => console.log(`- ${comp}`));
    if (!beta) {
      console.log("\nRedesigned beta components (install with -beta):");
      CONFIG.betaComponents.forEach((comp) => console.log(`- ${comp}`));
    }
    return false;
  }
  return true;
};

const main = async () => {
  const args = hideBin(process.argv).map((arg) => {
    if (arg === "-beta") return "--beta";
    if (arg === "-skill") return "--skill";
    return arg;
  });
  const argv = yargs(args)
    .option("add", {
      alias: "a",
      describe:
        "Component to install (single component or comma-separated list)",
      type: "string",
    })
    .option("interactive", {
      alias: "i",
      describe: "Interactive component selection mode",
      type: "boolean",
    })
    .option("list", {
      alias: "l",
      describe: "List available components",
      type: "boolean",
    })
    .option("beta", {
      describe: "Install redesigned beta components",
      type: "boolean",
      default: false,
    })
    .option("skill", {
      describe:
        "Install the GBS agent skill at the project root, for every supported agent",
      type: "boolean",
      default: false,
    })
    .option("for", {
      describe:
        "With --skill: which agents to write adapters for (claude, codex, antigravity, or none)",
      type: "string",
    })
    .option("force", {
      describe: "Replace files you have edited locally in shared/ or the skill",
      type: "boolean",
      default: false,
    })
    .example("$0 -a Button", "Install a single component")
    .example("$0 -a Button,Card,Modal", "Install multiple components")
    .example("$0 -a DataGrid -beta", "Install the redesigned beta DataGrid")
    .example("$0 -a Combobox -beta", "Install the redesigned beta Combobox")
    .example("$0 -skill", "Install the agent skill for every supported agent")
    .example("$0 -skill --for claude", "Only the Claude Code copy")
    .example("$0 -skill --for none", "Only .gbs/, no adapters")
    .example("$0 -a DataGrid -beta -skill", "Install a component and the skill")
    .example("$0 -i", "Interactive selection mode")
    .help().argv;

  // List components if requested
  if (argv.list) {
    const availableComponents = getAvailableComponents(argv.beta);
    console.log(`\nAvailable ${argv.beta ? "beta " : ""}components:`);
    availableComponents.forEach((comp) => {
      const deps = CONFIG.dependencies[comp]
        ? ` (requires: ${CONFIG.dependencies[comp].join(", ")})`
        : "";
      console.log(`- ${comp}${deps}`);
    });
    if (argv.beta) {
      console.log(
        `\nEvery beta component also installs component-lib/${SHARED_DIR}, which they all import.`,
      );
      console.log(
        `${NL}The agent skill installs separately, at the project root, for ${SKILL_TARGETS.join(", ")} and the GBS agent:${NL}  npx gbs-add-block -skill`,
      );
    } else {
      console.log("\nRedesigned beta components (install with -beta):");
      CONFIG.betaComponents.forEach((comp) => console.log(`- ${comp}`));
    }
    return;
  }

  // Interactive mode
  if (argv.interactive) {
    console.log("Starting interactive component selector...\n");
    const selectedComponents = await interactiveComponentSelector(argv.beta);

    if (selectedComponents.length === 0) {
      console.log("No components selected. Exiting...");
      return;
    }

    // Create destination directory in project root
    const destPath = DEFAULT_DEST_PATH;
    await fs.ensureDir(destPath);

    await copySupportFiles(destPath, argv.beta, { force: argv.force });

    // Install selected components
    await installMultipleComponents(selectedComponents, destPath, argv.beta);
    return;
  }

  // The skill goes to the project root, not component-lib, so it is handled
  // before anything reaches the component installer.
  if (argv.skill || isSkillWord(argv.add)) {
    await installSkill(process.cwd(), {
      force: argv.force,
      targets: parseSkillTargets(argv.for),
    });

    // `-a --skill` leaves `add` empty, and `-a skill` names no component.
    if (!argv.add || isSkillWord(argv.add)) return;
  }

  if (!argv.add) {
    console.error(
      "Please specify a component to install using -a/--add, install the agent skill with --skill, use -i/--interactive for interactive mode, or -l/--list to see available components",
    );
    process.exit(1);
  }

  // Parse components (single or multiple)
  const componentInput = argv.add;
  const components = parseMultipleComponents(componentInput).map(
    (component) =>
      normalizeComponent(component, getAvailableComponents(argv.beta)) ||
      component,
  );

  // Validate all components
  if (!validateComponents(components, argv.beta)) {
    process.exit(1);
  }

  // Create destination directory in project root
  const destPath = DEFAULT_DEST_PATH;
  await fs.ensureDir(destPath);

  await copySupportFiles(destPath, argv.beta, { force: argv.force });

  // Install components
  if (components.length === 1) {
    // Single component installation (existing behavior)
    await installComponentWithDependencies(components[0], destPath, argv.beta);
  } else {
    // Multiple components installation
    await installMultipleComponents(components, destPath, argv.beta);
  }
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
