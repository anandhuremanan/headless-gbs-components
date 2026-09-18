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
  ],
  // Beta folder names that are not simply the lowercased component name.
  betaFolders: {
    DataGrid: "data-grid",
    DatePicker: "date-picker",
    FileUploader: "file-uploader",
  },
  // Define component dependencies
  dependencies: {
    FormRenderer: ["Select", "MultiSelect", "Input", "DatePicker"],
  },
  docs: "https://gramprokit.vercel.app/",
};

const SOURCE_PATH = path.join(__dirname, "source", "components");
const BETA_SOURCE_PATH = path.join(__dirname, "source", "beta-components");
const DEFAULT_DEST_PATH = path.join(process.cwd(), "component-lib");

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
const isTestPath = (filePath) =>
  filePath.split(/[\\/]/).includes(TESTS_DIR);

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
      console.error("  Update the CLI, or re-run with --force to overwrite it anyway.");
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
    await fs.copy(path.join(src, file), path.join(dest, file), { overwrite: true });
  }

  // Remove what an older version left behind, but only files we installed and
  // the user has not since changed.
  if (manifest) {
    const removed = Object.keys(manifest.files).filter((file) => !files.includes(file));
    for (const file of removed) {
      const target = path.join(dest, file);
      if (fs.existsSync(target) && (force || manifest.files[file] === sha256(target))) {
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
    const componentSrc = path.join(getSourcePath(beta), folderFor(component, beta));
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
  const args = hideBin(process.argv).map((arg) =>
    arg === "-beta" ? "--beta" : arg,
  );
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
    .option("force", {
      describe: "Replace files in shared/ that you have edited locally",
      type: "boolean",
      default: false,
    })
    .example("$0 -a Button", "Install a single component")
    .example("$0 -a Button,Card,Modal", "Install multiple components")
    .example("$0 -a DataGrid -beta", "Install the redesigned beta DataGrid")
    .example("$0 -a Combobox -beta", "Install the redesigned beta Combobox")
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

  if (!argv.add) {
    console.error(
      "Please specify a component to install using -a/--add, use -i/--interactive for interactive mode, or -l/--list to see available components",
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
