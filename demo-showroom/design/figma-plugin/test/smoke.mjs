// Runs the built plugin (dist/code.js) against a mock `figma` API in Node.
// It can't prove the file looks right, but it catches runtime mistakes the
// type checker can't: unknown tokens, variant lookups that match nothing, text
// properties bound to missing layers, and a few of Figma's own layout rules.
//
//   npm run build && npm run smoke

import { readFileSync } from "node:fs";
import vm from "node:vm";

let nextId = 1;
const problems = [];
const fail = (message) => {
  throw new Error(message);
};

function makeNode(type, extra = {}) {
  const node = {
    id: `${nextId++}:0`,
    type,
    name: type,
    parent: null,
    children: [],
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    opacity: 1,
    fills: [],
    strokes: [],
    effects: [],
    visible: true,
    layoutMode: "NONE",
    componentPropertyReferences: null,
    appendChild(child) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
      child.parent = this;
      this.children.push(child);
    },
    insertChild(index, child) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
      child.parent = this;
      this.children.splice(index, 0, child);
    },
    resize(width, height) {
      if (!(width > 0) || !(height > 0)) fail(`${this.name}: resize(${width}, ${height}) needs positive sizes`);
      this.width = width;
      this.height = height;
    },
    resizeWithoutConstraints(width, height) {
      this.resize(width, height);
    },
    rescale(scale) {
      this.width *= scale;
      this.height *= scale;
    },
    findAll(predicate = () => true) {
      const found = [];
      const walk = (item) => {
        for (const child of item.children) {
          if (predicate(child)) found.push(child);
          walk(child);
        }
      };
      walk(this);
      return found;
    },
    findAllWithCriteria({ types }) {
      return this.findAll((item) => types.includes(item.type));
    },
    setBoundVariable(field, variable) {
      if (!variable) fail(`${this.name}: binding ${field} to a missing variable`);
    },
    setExplicitVariableModeForCollection(collection, modeId) {
      if (!collection || !modeId) fail("explicit mode needs a collection and a mode");
    },
    ...extra,
  };

  // Figma's auto layout sizing rules.
  for (const axis of ["layoutSizingHorizontal", "layoutSizingVertical"]) {
    let value = "FIXED";
    Object.defineProperty(node, axis, {
      get: () => value,
      set(next) {
        const parentIsAuto = node.parent && node.parent.layoutMode && node.parent.layoutMode !== "NONE";
        if (next === "FILL" && !parentIsAuto) fail(`${node.name}: ${axis}=FILL needs an auto layout parent`);
        if (next === "HUG" && node.type !== "TEXT" && node.type !== "INSTANCE" && node.layoutMode === "NONE") {
          fail(`${node.name}: ${axis}=HUG needs auto layout on the node`);
        }
        value = next;
      },
    });
  }
  let positioning = "AUTO";
  Object.defineProperty(node, "layoutPositioning", {
    get: () => positioning,
    set(next) {
      if (next === "ABSOLUTE" && (!node.parent || node.parent.layoutMode === "NONE")) {
        fail(`${node.name}: absolute positioning needs an auto layout parent`);
      }
      positioning = next;
    },
  });
  return node;
}

function makeText() {
  const node = makeNode("TEXT");
  let characters = "";
  let styled = false;
  Object.defineProperty(node, "characters", {
    get: () => characters,
    set(value) {
      if (!styled) fail("text characters set before a text style (font) was applied");
      characters = value;
    },
  });
  node.setTextStyleIdAsync = async (id) => {
    if (!id) fail("text style id missing");
    styled = true;
  };
  return node;
}

function makeComponent() {
  const component = makeNode("COMPONENT");
  component.createInstance = () => {
    const set = component.parent?.type === "COMPONENT_SET" ? component.parent : null;
    const inst = makeNode("INSTANCE", { mainComponent: component });
    inst.componentProperties = Object.fromEntries(
      Object.entries(set?.definitions ?? component.definitions ?? {}).map(([key, def]) => [key, { type: def.type, value: def.defaultValue }]),
    );
    inst.setProperties = (props) => {
      for (const key of Object.keys(props)) {
        if (!(key in inst.componentProperties)) fail(`instance of ${component.name}: unknown property ${key}`);
      }
    };
    return inst;
  };
  component.definitions = {};
  component.addComponentProperty = (name, type, defaultValue) => {
    const key = `${name}#${nextId++}:0`;
    component.definitions[key] = { type, defaultValue };
    return key;
  };
  return component;
}

let variableCount = 0;
const collections = [];
const figma = {
  mixed: Symbol("mixed"),
  root: makeNode("DOCUMENT"),
  variables: {
    getLocalVariableCollectionsAsync: async () => collections,
    getLocalVariablesAsync: async () => [],
    createVariableCollection(name) {
      const collection = {
        id: `collection:${collections.length}`,
        name,
        modes: [{ modeId: `${name}:0`, name: "Mode 1" }],
        renameMode(id, next) {
          this.modes.find((mode) => mode.modeId === id).name = next;
        },
        addMode(next) {
          const modeId = `${name}:${this.modes.length}`;
          this.modes.push({ modeId, name: next });
          return modeId;
        },
      };
      collections.push(collection);
      return collection;
    },
    createVariable(name, collection, type) {
      if (typeof collection !== "object") fail(`${name}: pass the collection object, not an id`);
      variableCount++;
      return {
        id: `variable:${variableCount}`,
        name,
        resolvedType: type,
        variableCollectionId: collection.id,
        valuesByMode: {},
        setValueForMode(mode, value) {
          if (type === "COLOR" && (typeof value !== "object" || Number.isNaN(value.r))) fail(`${name}: bad color`);
          this.valuesByMode[mode] = value;
        },
      };
    },
    setBoundVariableForPaint(paint, field, variable) {
      if (!variable) fail("paint bound to a missing variable");
      return { ...paint, boundVariables: { [field]: { id: variable.id } } };
    },
    setBoundVariableForEffect(effect, field, variable) {
      if (!variable) fail("effect bound to a missing variable");
      return { ...effect, boundVariables: { [field]: { id: variable.id } } };
    },
  },
  loadFontAsync: async () => {},
  loadAllPagesAsync: async () => {},
  getLocalTextStylesAsync: async () => [],
  createTextStyle: () => ({ id: `style:${nextId++}`, name: "" }),
  createPage() {
    const page = makeNode("PAGE");
    figma.root.appendChild(page);
    return page;
  },
  setCurrentPageAsync: async () => {},
  createFrame: () => makeNode("FRAME"),
  createText: makeText,
  createEllipse: () => makeNode("ELLIPSE"),
  createComponent: makeComponent,
  createNodeFromSvg(svg) {
    if (!svg.includes("<svg")) fail("not an svg");
    const wrapper = makeNode("FRAME", { width: 24, height: 24 });
    wrapper.appendChild(makeNode("VECTOR", { strokes: [{ type: "SOLID" }] }));
    return wrapper;
  },
  combineAsVariants(components, parent) {
    if (components.length === 0) fail("combineAsVariants needs components");
    const set = makeNode("COMPONENT_SET");
    set.definitions = {};
    set.addComponentProperty = (name, type, defaultValue) => {
      const key = `${name}#${nextId++}:0`;
      set.definitions[key] = { type, defaultValue };
      return key;
    };
    const names = new Set();
    for (const component of components) {
      if (component.parent !== parent) fail(`${component.name}: variants must share the set's parent`);
      if (names.has(component.name)) fail(`duplicate variant ${component.name}`);
      names.add(component.name);
      set.appendChild(component);
    }
    parent.appendChild(set);
    return set;
  },
  notify: () => {},
  viewport: { scrollAndZoomIntoView: () => {} },
  closePlugin(message) {
    figma.closed = message;
  },
};

// Property references must point at real layers of the right type.
const originalFindAll = makeNode("FRAME").findAll;
void originalFindAll;

const code = readFileSync(new URL("../dist/code.js", import.meta.url), "utf8");
const context = vm.createContext({ figma, console, Promise, Math, Date, Object, Array, JSON, Map, Set, Number, String, Symbol, Error, parseInt });
vm.runInContext(code, context);

// Wait for the async run to finish.
const started = Date.now();
while (!figma.closed && Date.now() - started < 60_000) {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

const pages = figma.root.children;
const sets = pages.flatMap((page) => page.findAll((node) => node.type === "COMPONENT_SET"));
let unreferenced = 0;
for (const set of sets) {
  for (const [key, def] of Object.entries(set.definitions)) {
    const used = set.findAll((node) => node.componentPropertyReferences && Object.values(node.componentPropertyReferences).includes(key));
    if (used.length === 0) {
      unreferenced++;
      problems.push(`${set.name}: property "${key.split("#")[0]}" (${def.type}) isn't bound to any layer`);
    }
  }
}

console.log(figma.closed ?? "Timed out");
console.log(`pages: ${pages.map((page) => page.name).join(" | ")}`);
console.log(`component sets: ${sets.length} — ${sets.map((set) => `${set.name} (${set.children.length})`).join(", ")}`);
console.log(`variables: ${variableCount}, collections: ${collections.map((c) => `${c.name} [${c.modes.map((m) => m.name)}]`).join(", ")}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
}
const ok = figma.closed?.startsWith("Grampro Kit ready") && unreferenced === 0;
process.exit(ok ? 0 : 1);
