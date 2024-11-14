#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");

const COMPONENTS = [
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
];

const FRAMEWORKS = {
  next: "Next.js",
  vite: "Vite",
};

const SOURCE_PATH = path.join(__dirname, "source", "components");
let DEST_PATH;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isFirstCopy = true;

function listFrameworks() {
  console.log("Available frameworks:");
  console.log("");
  Object.entries(FRAMEWORKS).forEach(([key, name], index) => {
    console.log(`${index + 1}. ${name}`);
  });
}

function listComponents() {
  console.log(" ");
  console.log("Available components:");
  console.log(" ");
  COMPONENTS.forEach((component, index) => {
    console.log(`${index + 1}. ${component}`);
  });
}

function copyCommonFiles() {
  // Copy utils.ts
  const utilsSrc = path.join(SOURCE_PATH, "..", "utils.ts");
  const utilsDest = path.join(DEST_PATH, "utils.ts");
  fs.copySync(utilsSrc, utilsDest, { overwrite: true });
  console.log(`utils.ts copied successfully to ${utilsDest}`);

  // Copy GlobalStyles
  const globalStyleSrc = path.join(SOURCE_PATH, "..", "globalStyle.ts");
  const globalStyleDest = path.join(DEST_PATH, "globalStyle.ts");
  fs.copySync(globalStyleSrc, globalStyleDest, { overwrite: true });
  console.log(`utils.ts copied successfully to ${globalStyleDest}`);

  // Copy icon folder
  const iconSrc = path.join(SOURCE_PATH, "..", "icon");
  const iconDest = path.join(DEST_PATH, "icon");
  fs.copySync(iconSrc, iconDest, { overwrite: true });
  console.log(`icon folder copied successfully to ${iconDest}`);
}

function copyComponent(component) {
  const componentSrc = path.join(SOURCE_PATH, component.toLowerCase());
  const componentDest = path.join(DEST_PATH, component.toLowerCase());

  if (!fs.existsSync(componentSrc)) {
    console.error(`Component ${component} not found in source directory.`);
    return;
  }

  fs.copySync(componentSrc, componentDest, { overwrite: true });
  console.log("");
  console.log(`Component ${component} copied successfully to ${componentDest}`);
  console.log("");
  console.log(
    "For Props and Usage Guides Visit : https://blackmax-designs.gitbook.io/building-block-v2.0"
  );
  console.log("");

  if (isFirstCopy) {
    copyCommonFiles();
    isFirstCopy = false;
  }
}

function promptForFramework() {
  listFrameworks();
  rl.question("Select your framework (enter the number): ", (answer) => {
    const index = parseInt(answer) - 1;
    const frameworks = Object.keys(FRAMEWORKS);

    if (isNaN(index) || index < 0 || index >= frameworks.length) {
      console.log("Invalid selection. Please try again.");
      promptForFramework();
      return;
    }

    const selectedFramework = frameworks[index];

    // Set destination path based on framework
    if (selectedFramework === "next") {
      DEST_PATH = path.join(process.cwd(), "app", "component-lib");
    } else {
      DEST_PATH = path.join(process.cwd(), "src", "component-lib");
    }

    // Ensure the destination directory exists
    fs.ensureDirSync(DEST_PATH);

    // Continue with component selection
    promptForComponent();
  });
}

function promptForComponent() {
  listComponents();
  rl.question(
    'Enter the number of the component you want to copy (or "q" to quit): ',
    (answer) => {
      if (answer.toLowerCase() === "q") {
        rl.close();
        return;
      }

      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= COMPONENTS.length) {
        console.log("Invalid selection. Please try again.");
        promptForComponent();
        return;
      }

      const selectedComponent = COMPONENTS[index];
      copyComponent(selectedComponent);

      rl.question(
        "Do you want to copy another component? (y/n): ",
        (answer) => {
          if (answer.toLowerCase() === "y") {
            promptForComponent();
          } else {
            rl.close();
          }
        }
      );
    }
  );
}

// Start with framework selection
promptForFramework();
