#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

// Configuration
const CONFIG = {
  components: [
    "Select",
    "Grid",
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
    "Uploader",
    "FormRenderer",
    "MaterialInput",
    "ContextMenu",
    "Skeleton",
    "Navbar",
  ],
  // Define component dependencies
  dependencies: {
    FormRenderer: ["Select", "MultiSelect", "Input", "DatePicker"],
  },
  frameworks: {
    next: {
      name: "Next.js",
      path: ["app", "component-lib"],
    },
    vite: {
      name: "Vite",
      path: ["src", "component-lib"],
    },
  },
  docs: "https://blackmax-designs.gitbook.io/building-block-v2.0",
};

const SOURCE_PATH = path.join(__dirname, "source", "components");

const copyCommonFiles = async (destPath) => {
  const commonFiles = [
    { src: ["..", "utils.ts"], dest: "utils.ts" },
    { src: ["..", "globalStyle.ts"], dest: "globalStyle.ts" },
    { src: ["..", "icon"], dest: "icon" },
  ];

  for (const file of commonFiles) {
    const src = path.join(SOURCE_PATH, ...file.src);
    const dest = path.join(destPath, file.dest);
    await fs.copy(src, dest, { overwrite: true });
    console.log(`✓ ${file.dest} copied successfully`);
  }
};

const checkComponentExists = (component, destPath) => {
  const componentPath = path.join(destPath, component.toLowerCase());
  return fs.existsSync(componentPath);
};

const copyComponent = async (component, destPath) => {
  try {
    const componentSrc = path.join(SOURCE_PATH, component.toLowerCase());
    const componentDest = path.join(destPath, component.toLowerCase());

    if (!fs.existsSync(componentSrc)) {
      throw new Error(`Component ${component} not found in source directory.`);
    }

    await fs.copy(componentSrc, componentDest, { overwrite: true });
    console.log(`✓ Component ${component} installed successfully`);
  } catch (error) {
    console.error(`Error installing component ${component}:`, error.message);
    process.exit(1);
  }
};

const installComponentWithDependencies = async (component, destPath) => {
  // Get dependencies for the component
  const dependencies = CONFIG.dependencies[component] || [];
  const componentsToInstall = new Set([component, ...dependencies]);

  // Check which components need to be installed
  const pendingInstalls = Array.from(componentsToInstall).filter(
    (comp) => !checkComponentExists(comp, destPath)
  );

  if (pendingInstalls.length === 0) {
    console.log(
      `✓ ${component} and all its dependencies are already installed.`
    );
    return;
  }

  // Install all pending components
  for (const comp of pendingInstalls) {
    await copyComponent(comp, destPath);
  }

  if (dependencies.length > 0) {
    console.log(`\nInstalled dependencies for ${component}:`);
    dependencies.forEach((dep) => {
      console.log(`- ${dep}`);
    });
  }

  console.log(`\nFor documentation visit: ${CONFIG.docs}`);
};

const detectFramework = () => {
  // Check for Next.js
  if (
    fs.existsSync(path.join(process.cwd(), "next.config.ts")) ||
    fs.existsSync(path.join(process.cwd(), "next.config.js"))
  ) {
    return "next";
  }
  // Check for Vite
  if (
    fs.existsSync(path.join(process.cwd(), "vite.config.js")) ||
    fs.existsSync(path.join(process.cwd(), "vite.config.ts"))
  ) {
    return "vite";
  }
  return null;
};

const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .option("add", {
      alias: "a",
      describe: "Component to install",
      type: "string",
    })
    .option("framework", {
      alias: "f",
      describe: "Framework to use (next or vite)",
      type: "string",
    })
    .option("list", {
      alias: "l",
      describe: "List available components",
      type: "boolean",
    })
    .help().argv;

  // List components if requested
  if (argv.list) {
    console.log("\nAvailable components:");
    CONFIG.components.forEach((comp) => {
      const deps = CONFIG.dependencies[comp]
        ? ` (requires: ${CONFIG.dependencies[comp].join(", ")})`
        : "";
      console.log(`- ${comp}${deps}`);
    });
    return;
  }

  if (!argv.add) {
    console.error("Please specify a component to install using -a or --add");
    process.exit(1);
  }

  // Validate component name
  const component = argv.add;
  if (!CONFIG.components.includes(component)) {
    console.error(`Invalid component: ${component}`);
    console.log("\nAvailable components:");
    CONFIG.components.forEach((comp) => console.log(`- ${comp}`));
    process.exit(1);
  }

  // Detect or get framework
  let framework = argv.framework;
  if (!framework) {
    framework = detectFramework();
    if (!framework) {
      console.error(
        "Could not detect framework. Please specify using -f or --framework"
      );
      process.exit(1);
    }
  }

  if (!CONFIG.frameworks[framework]) {
    console.error(`Unsupported framework: ${framework}`);
    process.exit(1);
  }

  // Create destination directory
  const destPath = path.join(
    process.cwd(),
    ...CONFIG.frameworks[framework].path
  );
  await fs.ensureDir(destPath);

  // Copy common files if they don't exist
  if (!fs.existsSync(path.join(destPath, "utils.ts"))) {
    await copyCommonFiles(destPath);
  }

  // Install component and its dependencies
  await installComponentWithDependencies(component, destPath);
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
