#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const { createInterface } = require("readline");

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
    "materialInput",
  ],
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
let isFirstCopy = true;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) =>
  new Promise((resolve) => {
    rl.question(question, resolve);
  });

const displayOptions = (options, title) => {
  console.log(`\n${title}:\n`);
  options.forEach((option, index) => console.log(`${index + 1}. ${option}`));
  console.log("");
};

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
    console.log(`${file.dest} copied successfully to ${dest}`);
  }
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
      `\nComponent ${component} copied successfully to ${componentDest}`
    );

    if (isFirstCopy) {
      await copyCommonFiles(destPath);
      isFirstCopy = false;
    }

    console.log(`\nFor Props and Usage Guides Visit: ${CONFIG.docs}\n`);
  } catch (error) {
    console.error(`Error copying component ${component}:`, error.message);
  }
};

const selectFramework = async () => {
  displayOptions(
    Object.values(CONFIG.frameworks).map((f) => f.name),
    "Available frameworks"
  );

  const answer = await prompt("Select your framework (enter the number): ");
  const index = parseInt(answer) - 1;
  const frameworks = Object.keys(CONFIG.frameworks);

  if (isNaN(index) || index < 0 || index >= frameworks.length) {
    throw new Error("Invalid framework selection");
  }

  return frameworks[index];
};

const handleComponentSelection = async (destPath) => {
  while (true) {
    displayOptions(CONFIG.components, "Available components");

    const answer = await prompt(
      'Enter the number of the component to copy (or "q" to quit): '
    );

    if (answer.toLowerCase() === "q") break;

    const index = parseInt(answer) - 1;
    if (isNaN(index) || index < 0 || index >= CONFIG.components.length) {
      console.log("Invalid selection. Please try again.");
      continue;
    }

    await copyComponent(CONFIG.components[index], destPath);

    const continueAnswer = await prompt(
      "Do you want to copy another component? (y/n): "
    );
    if (continueAnswer.toLowerCase() !== "y") break;
  }
};

const main = async () => {
  try {
    const framework = await selectFramework();
    const destPath = path.join(
      process.cwd(),
      ...CONFIG.frameworks[framework].path
    );

    await fs.ensureDir(destPath);
    await handleComponentSelection(destPath);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Run the script
main();
