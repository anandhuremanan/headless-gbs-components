#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
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
    "DataGridBeta"
  ],
  // Define component dependencies
  dependencies: {
    FormRenderer: ["Select", "MultiSelect", "Input", "DatePicker"],
  },
  docs: "https://gramprokit.imanandhu.in",
};

const SOURCE_PATH = path.join(__dirname, "source", "components");
const DEFAULT_DEST_PATH = path.join(process.cwd(), "component-lib");

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
    console.log(
      `✓ Component ${component} installed successfully ${
        component === "Grid"
          ? "This Version of Grid will be deprecated soon. Please Install The New Data Grid Component"
          : ""
      }`
    );
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

const installMultipleComponents = async (components, destPath) => {
  const allComponentsToInstall = new Set();

  // Collect all components and their dependencies
  components.forEach((component) => {
    const dependencies = CONFIG.dependencies[component] || [];
    allComponentsToInstall.add(component);
    dependencies.forEach((dep) => allComponentsToInstall.add(dep));
  });

  // Filter out already installed components
  const pendingInstalls = Array.from(allComponentsToInstall).filter(
    (comp) => !checkComponentExists(comp, destPath)
  );

  if (pendingInstalls.length === 0) {
    console.log(
      "✓ All selected components and their dependencies are already installed."
    );
    return;
  }

  console.log(`\nInstalling ${pendingInstalls.length} components...`);

  // Install all pending components
  for (const comp of pendingInstalls) {
    await copyComponent(comp, destPath);
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

const interactiveComponentSelector = async () => {
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
        "Use ↑/↓ arrow keys to navigate, SPACE to select/deselect, ENTER to install\n"
      );

      CONFIG.components.forEach((component, index) => {
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
        case "\u001b[A": // Up arrow
          currentIndex = Math.max(0, currentIndex - 1);
          renderMenu();
          break;
        case "\u001b[B": // Down arrow
          currentIndex = Math.min(
            CONFIG.components.length - 1,
            currentIndex + 1
          );
          renderMenu();
          break;
        case " ": // Space bar
          const component = CONFIG.components[currentIndex];
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

const validateComponents = (components) => {
  const invalidComponents = components.filter(
    (comp) => !CONFIG.components.includes(comp)
  );
  if (invalidComponents.length > 0) {
    console.error(`Invalid components: ${invalidComponents.join(", ")}`);
    console.log("\nAvailable components:");
    CONFIG.components.forEach((comp) => console.log(`- ${comp}`));
    return false;
  }
  return true;
};

const main = async () => {
  const argv = yargs(hideBin(process.argv))
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
    .example("$0 -a Button", "Install a single component")
    .example("$0 -a Button,Card,Modal", "Install multiple components")
    .example("$0 -i", "Interactive selection mode")
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

  // Interactive mode
  if (argv.interactive) {
    console.log("Starting interactive component selector...\n");
    const selectedComponents = await interactiveComponentSelector();

    if (selectedComponents.length === 0) {
      console.log("No components selected. Exiting...");
      return;
    }

    // Create destination directory in project root
    const destPath = DEFAULT_DEST_PATH;
    await fs.ensureDir(destPath);

    // Copy common files if they don't exist
    if (!fs.existsSync(path.join(destPath, "utils.ts"))) {
      await copyCommonFiles(destPath);
    }

    // Install selected components
    await installMultipleComponents(selectedComponents, destPath);
    return;
  }

  if (!argv.add) {
    console.error(
      "Please specify a component to install using -a/--add, use -i/--interactive for interactive mode, or -l/--list to see available components"
    );
    process.exit(1);
  }

  // Parse components (single or multiple)
  const componentInput = argv.add;
  const components = parseMultipleComponents(componentInput);

  // Validate all components
  if (!validateComponents(components)) {
    process.exit(1);
  }

  // Create destination directory in project root
  const destPath = DEFAULT_DEST_PATH;
  await fs.ensureDir(destPath);

  // Copy common files if they don't exist
  if (!fs.existsSync(path.join(destPath, "utils.ts"))) {
    await copyCommonFiles(destPath);
  }

  // Install components
  if (components.length === 1) {
    // Single component installation (existing behavior)
    await installComponentWithDependencies(components[0], destPath);
  } else {
    // Multiple components installation
    await installMultipleComponents(components, destPath);
  }
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
