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
  "Uploader"
];
const SOURCE_PATH = path.join(__dirname, "source", "components");
const DEST_PATH = path.join(process.cwd(), "src", "component-lib");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isFirstCopy = true;

function listComponents() {
  console.log("Available components:");
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
  console.log(`Component ${component} copied successfully to ${componentDest}`);

  if (isFirstCopy) {
    copyCommonFiles();
    isFirstCopy = false;
  }
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

// Ensure the destination directory exists
fs.ensureDirSync(DEST_PATH);

// Start the component selection process
promptForComponent();
