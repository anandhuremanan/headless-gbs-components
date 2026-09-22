// Helpers shared by every generator: tokens → Figma variables and styles, and
// small builders that keep auto layout and variable bindings consistent.

interface Kit {
  colorCollection: VariableCollection;
  lightMode: string;
  /** Null on Figma plans that allow a single mode per collection. */
  darkMode: string | null;
  colors: Record<string, Variable>;
  numbers: Record<string, Variable>;
  text: Record<string, TextStyle>;
}

let KIT: Kit;

const FONT_WEIGHTS: TypeToken["weight"][] = ["Regular", "Medium", "Semi Bold"];

function hexToRgba(hex: string): RGBA {
  const value = hex.replace("#", "");
  const channel = (index: number) => parseInt(value.slice(index, index + 2), 16) / 255;
  return { r: channel(0), g: channel(2), b: channel(4), a: value.length === 8 ? channel(6) : 1 };
}

function colorScopes(name: string): VariableScope[] {
  if (name.startsWith("text/")) return ["TEXT_FILL"];
  if (name.startsWith("border/")) return ["STROKE_COLOR"];
  return ["ALL_FILLS", "STROKE_COLOR", "EFFECT_COLOR"];
}

function numberScopes(name: string): VariableScope[] {
  if (name.startsWith("radius/")) return ["CORNER_RADIUS"];
  if (name.startsWith("control/")) return ["WIDTH_HEIGHT"];
  return ["GAP"];
}

/** Creates the variables and text styles, or updates them when the plugin runs again. */
async function buildKit(): Promise<Kit> {
  await Promise.all(FONT_WEIGHTS.map((style) => figma.loadFontAsync({ family: TYPE_FAMILY, style })));

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const findOrCreateCollection = (name: string) =>
    collections.find((collection) => collection.name === name) ?? figma.variables.createVariableCollection(name);
  const upsert = (collection: VariableCollection, name: string, type: VariableResolvedDataType) =>
    variables.find((variable) => variable.name === name && variable.variableCollectionId === collection.id) ??
    figma.variables.createVariable(name, collection, type);

  // Colors: one collection with Light and Dark modes.
  const colorCollection = findOrCreateCollection("Grampro Kit · Color");
  const lightMode = colorCollection.modes[0].modeId;
  colorCollection.renameMode(lightMode, "Light");
  let darkMode = colorCollection.modes.find((mode) => mode.name === "Dark")?.modeId ?? null;
  if (!darkMode) {
    try {
      darkMode = colorCollection.addMode("Dark");
    } catch {
      darkMode = null; // Starter plans allow one mode; dark values are then skipped.
    }
  }

  const colors: Record<string, Variable> = {};
  for (const token of COLOR_TOKENS) {
    const variable = upsert(colorCollection, token.name, "COLOR");
    variable.description = token.description;
    variable.scopes = colorScopes(token.name);
    variable.setValueForMode(lightMode, hexToRgba(token.light));
    if (darkMode) variable.setValueForMode(darkMode, hexToRgba(token.dark));
    colors[token.name] = variable;
  }

  // Sizes: radius, control heights, spacing.
  const sizeCollection = findOrCreateCollection("Grampro Kit · Size");
  const sizeMode = sizeCollection.modes[0].modeId;
  sizeCollection.renameMode(sizeMode, "Default");
  const numbers: Record<string, Variable> = {};
  for (const token of NUMBER_TOKENS) {
    const variable = upsert(sizeCollection, token.name, "FLOAT");
    variable.description = token.description;
    variable.scopes = numberScopes(token.name);
    variable.setValueForMode(sizeMode, token.value);
    numbers[token.name] = variable;
  }

  // Text styles.
  const existingStyles = await figma.getLocalTextStylesAsync();
  const text: Record<string, TextStyle> = {};
  for (const token of TYPE_TOKENS) {
    const name = `Grampro Kit/${token.name}`;
    const style = existingStyles.find((item) => item.name === name) ?? figma.createTextStyle();
    style.name = name;
    style.fontName = { family: TYPE_FAMILY, style: token.weight };
    style.fontSize = token.size;
    style.lineHeight = { unit: "PIXELS", value: token.lineHeight };
    style.description = token.description;
    text[token.name] = style;
  }

  return { colorCollection, lightMode, darkMode, colors, numbers, text };
}

/* ------------------------------------------------------------------ paint */

function paintOf(token: string): SolidPaint {
  const variable = KIT.colors[token];
  if (!variable) throw new Error(`Unknown color token: ${token}`);
  const base: SolidPaint = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
  return figma.variables.setBoundVariableForPaint(base, "color", variable);
}

function setFill(node: MinimalFillsMixin, token: string | null) {
  node.fills = token ? [paintOf(token)] : [];
}

function setStroke(node: MinimalStrokesMixin & { strokeWeight: number | PluginAPI["mixed"] }, token: string | null, weight = 1) {
  node.strokes = token ? [paintOf(token)] : [];
  if (token) node.strokeWeight = weight;
}

function bindNumber(node: SceneNode, field: VariableBindableNodeField, token: string) {
  const variable = KIT.numbers[token];
  if (!variable) throw new Error(`Unknown size token: ${token}`);
  (node as FrameNode).setBoundVariable(field, variable);
}

function shadow(offsetY: number, blur: number, spread: number, alpha: number): DropShadowEffect {
  return {
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: alpha },
    offset: { x: 0, y: offsetY },
    radius: blur,
    spread,
    visible: true,
    blendMode: "NORMAL",
  };
}

/* ----------------------------------------------------------------- frames */

type Size = number | "hug" | "fill";

interface FrameOptions {
  direction?: "row" | "column" | "none";
  gap?: number;
  padding?: number | [number, number] | [number, number, number, number];
  /** Main axis. */
  justify?: "start" | "center" | "end" | "between";
  /** Cross axis. */
  align?: "start" | "center" | "end";
  fill?: string | null;
  stroke?: string | null;
  strokeWeight?: number;
  /** A radius token name, or pixels. */
  radius?: string | number;
  width?: Size;
  height?: Size;
  wrap?: boolean;
  clip?: boolean;
}

const JUSTIFY: Record<NonNullable<FrameOptions["justify"]>, "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"> = {
  start: "MIN",
  center: "CENTER",
  end: "MAX",
  between: "SPACE_BETWEEN",
};
const ALIGN: Record<NonNullable<FrameOptions["align"]>, "MIN" | "CENTER" | "MAX"> = {
  start: "MIN",
  center: "CENTER",
  end: "MAX",
};

function applyLayout(node: FrameNode | ComponentNode, options: FrameOptions) {
  const direction = options.direction ?? "row";
  if (direction !== "none") {
    node.layoutMode = direction === "row" ? "HORIZONTAL" : "VERTICAL";
    node.itemSpacing = options.gap ?? 0;
    node.primaryAxisAlignItems = JUSTIFY[options.justify ?? "start"];
    node.counterAxisAlignItems = ALIGN[options.align ?? (direction === "row" ? "center" : "start")];
    if (options.wrap) node.layoutWrap = "WRAP";
    const padding = options.padding ?? 0;
    const [top, right, bottom, left] =
      typeof padding === "number"
        ? [padding, padding, padding, padding]
        : padding.length === 2
          ? [padding[0], padding[1], padding[0], padding[1]]
          : padding;
    node.paddingTop = top;
    node.paddingRight = right;
    node.paddingBottom = bottom;
    node.paddingLeft = left;
  }
  setFill(node, options.fill ?? null);
  if (options.stroke) setStroke(node, options.stroke, options.strokeWeight ?? 1);
  if (options.radius !== undefined) {
    if (typeof options.radius === "number") node.cornerRadius = options.radius;
    else bindNumber(node, "cornerRadius", options.radius);
  }
  node.clipsContent = options.clip ?? false;
}

/** Sizing only takes effect once a node is inside its parent, so call this after appending. */
function applySize(node: FrameNode | ComponentNode | TextNode | InstanceNode, width?: Size, height?: Size) {
  const set = (axis: "Horizontal" | "Vertical", size: Size | undefined) => {
    if (size === undefined) return;
    const key = axis === "Horizontal" ? "layoutSizingHorizontal" : "layoutSizingVertical";
    if (size === "hug") {
      if (node.type !== "INSTANCE" && "layoutMode" in node && node.layoutMode === "NONE") return;
      node[key] = "HUG";
    } else if (size === "fill") {
      if (node.parent && "layoutMode" in node.parent && node.parent.layoutMode !== "NONE") node[key] = "FILL";
    } else {
      if (axis === "Horizontal") node.resize(size, node.height);
      else node.resize(node.width, size);
      node[key] = "FIXED";
    }
  };
  set("Horizontal", width);
  set("Vertical", height);
}

function frame(name: string, options: FrameOptions = {}, parent?: BaseNode & ChildrenMixin): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  applyLayout(node, options);
  if (parent) parent.appendChild(node);
  applySize(node, options.width ?? "hug", options.height ?? "hug");
  return node;
}

/* ------------------------------------------------------------------- text */

interface TextOptions {
  color?: string;
  width?: Size;
  align?: "LEFT" | "CENTER" | "RIGHT";
  truncate?: boolean;
}

async function text(
  parent: BaseNode & ChildrenMixin,
  characters: string,
  style: string,
  options: TextOptions = {},
): Promise<TextNode> {
  const node = figma.createText();
  const textStyle = KIT.text[style];
  if (!textStyle) throw new Error(`Unknown text style: ${style}`);
  await node.setTextStyleIdAsync(textStyle.id);
  node.characters = characters;
  setFill(node, options.color ?? "text/primary");
  if (options.align) node.textAlignHorizontal = options.align;
  parent.appendChild(node);
  if (options.width !== undefined) {
    node.textAutoResize = options.width === "hug" ? "WIDTH_AND_HEIGHT" : "HEIGHT";
    applySize(node, options.width);
  }
  if (options.truncate) {
    node.textAutoResize = "HEIGHT";
    node.textTruncation = "ENDING";
    node.maxLines = 1;
  }
  return node;
}

/* ------------------------------------------------------------------ icons */

const ICONS = {
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M20 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  retry: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  success: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>',
  warning: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  danger: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  sort: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  filter: '<path d="M4 5h16l-6 8v5l-4 2v-7Z"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  arrowFlat: '<path d="M5 12h14"/>',
  inbox: '<path d="M5 4h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z"/><path d="M3 12h5l1.5 3h5L21 12"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  spinnerArc: '<path d="M12 3a9 9 0 1 0 9 9"/>',
} as const;

type IconName = keyof typeof ICONS;

/** A 24-unit stroke icon, recolored with a color variable and scaled to `size`. */
function icon(parent: BaseNode & ChildrenMixin, name: IconName, colorToken: string, size = 16): FrameNode {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  const node = figma.createNodeFromSvg(svg);
  node.name = `icon/${name}`;
  node.fills = [];
  for (const child of node.findAll((item) => "strokes" in item)) {
    const shape = child as VectorNode;
    if (shape.strokes.length > 0) shape.strokes = [paintOf(colorToken)];
  }
  parent.appendChild(node);
  node.rescale(size / 24);
  node.constrainProportions = true;
  return node;
}

/* ------------------------------------------------------------- components */

interface Variant {
  /** Variant properties, e.g. `{ Variant: "Primary", Size: "md", State: "Default" }`. */
  props: Record<string, string>;
  build(component: ComponentNode): Promise<void>;
}

/**
 * Builds each variant as a component, combines them into a component set and
 * lays the set out as a wrapping grid, the way designers expect to browse it.
 */
async function variantSet(
  parent: BaseNode & ChildrenMixin,
  name: string,
  description: string,
  variants: Variant[],
  columns = 4,
): Promise<ComponentSetNode> {
  const components: ComponentNode[] = [];
  for (const variant of variants) {
    const component = figma.createComponent();
    component.name = Object.entries(variant.props)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    parent.appendChild(component);
    await variant.build(component);
    components.push(component);
  }
  const set = figma.combineAsVariants(components, parent);
  set.name = name;
  set.description = description;

  // A grid: `columns` variants per row, 24 px apart.
  let x = 24;
  let y = 24;
  let rowHeight = 0;
  set.children.forEach((child, index) => {
    if (index > 0 && index % columns === 0) {
      x = 24;
      y += rowHeight + 24;
      rowHeight = 0;
    }
    child.x = x;
    child.y = y;
    x += Math.max(child.width, 120) + 24;
    rowHeight = Math.max(rowHeight, child.height);
  });
  const right = Math.max(...set.children.map((child) => child.x + child.width));
  const bottom = Math.max(...set.children.map((child) => child.y + child.height));
  set.resizeWithoutConstraints(right + 24, bottom + 24);
  setStroke(set, "accent/default");
  set.dashPattern = [6, 4];
  set.cornerRadius = 8;
  return set;
}

/** Adds a text component property to a set and wires it to the named layer in every variant. */
function textProperty(set: ComponentSetNode, property: string, layerName: string, defaultValue: string) {
  const key = set.addComponentProperty(property, "TEXT", defaultValue);
  for (const variant of set.children as ComponentNode[]) {
    for (const layer of variant.findAll((node) => node.type === "TEXT" && node.name === layerName)) {
      layer.componentPropertyReferences = { characters: key };
    }
  }
}

/** Adds a boolean property that shows or hides the named layers in every variant. */
function booleanProperty(set: ComponentSetNode, property: string, layerName: string, defaultValue: boolean) {
  const key = set.addComponentProperty(property, "BOOLEAN", defaultValue);
  for (const variant of set.children as ComponentNode[]) {
    for (const layer of variant.findAll((node) => node.name === layerName)) {
      layer.componentPropertyReferences = { ...layer.componentPropertyReferences, visible: key };
    }
  }
}

/* ------------------------------------------------------ documentation layout */

/** A documented section on a page: title, description, then the content. */
async function docSection(page: PageNode, title: string, description: string): Promise<FrameNode> {
  const section = frame(title, { direction: "column", gap: 16, padding: 40, fill: "surface/bg", radius: 16, width: 1400 });
  page.appendChild(section);
  applySize(section, 1400, "hug");
  await text(section, title, "Title/Section");
  await text(section, description, "Body/Default", { color: "text/muted", width: "fill" });
  return section;
}

/** Stacks page children vertically, since pages have no auto layout. */
function stackPage(page: PageNode, gap = 80) {
  let y = 0;
  for (const child of page.children) {
    child.x = 0;
    child.y = y;
    y += child.height + gap;
  }
}

/** The variant of a set matching every given property, for building examples from instances. */
function variantOf(set: ComponentSetNode, props: Record<string, string>): ComponentNode {
  const match = (set.children as ComponentNode[]).find((component) =>
    Object.entries(props).every(([key, value]) => component.name.split(", ").includes(`${key}=${value}`)),
  );
  if (!match) throw new Error(`${set.name} has no variant ${JSON.stringify(props)}`);
  return match;
}

function instance(parent: BaseNode & ChildrenMixin, set: ComponentSetNode, props: Record<string, string>): InstanceNode {
  const node = variantOf(set, props).createInstance();
  parent.appendChild(node);
  return node;
}

/** Sets a text property on an instance by the property's display name. */
function setInstanceText(node: InstanceNode, property: string, value: string) {
  const key = Object.keys(node.componentProperties).find((name) => name.split("#")[0] === property);
  if (key) node.setProperties({ [key]: value });
}

/** A focus ring: a 2 px halo in the focus color, as :focus-visible draws it. */
function focusRing(): DropShadowEffect {
  return figma.variables.setBoundVariableForEffect(shadow(0, 0, 2, 1), "color", KIT.colors["accent/focus"]) as DropShadowEffect;
}

/** A labelled row of examples inside a section. */
async function exampleRow(section: FrameNode, label: string): Promise<FrameNode> {
  await text(section, label, "Label/Strong", { color: "text/muted" });
  const row = frame(label, { direction: "row", gap: 16, wrap: true, align: "start" }, section);
  applySize(row, "fill", "hug");
  row.counterAxisSpacing = 16;
  return row;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
