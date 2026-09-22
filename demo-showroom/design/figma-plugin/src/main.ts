// Entry point: builds the variables and styles, then one page per area.

const PAGES: [string, (page: PageNode) => Promise<void>][] = [
  ["Foundations", buildFoundations],
  ["Components · Actions & navigation", buildActions],
  ["Components · Forms", buildForms],
  ["Components · Choice & quantity", buildControls],
  ["Components · Overlays & data", buildOverlays],
  ["Components · Menus & surfaces", buildSurfaces],
  ["Components · Status & identity", buildDisplay],
];

/**
 * Creates a fresh page. A page left by an earlier run is renamed, not deleted,
 * so nothing a designer added to it is lost; delete it once you've checked.
 */
async function preparePage(name: string, stamp: string): Promise<PageNode> {
  const existing = figma.root.children.find((page) => page.name === name);
  if (existing) existing.name = `${name} (previous ${stamp})`;
  const page = figma.createPage();
  page.name = name;
  page.backgrounds = [{ type: "SOLID", color: { r: 0.957, g: 0.957, b: 0.961 } }];
  await figma.setCurrentPageAsync(page);
  return page;
}

async function run() {
  await figma.loadAllPagesAsync();
  figma.notify("Grampro Kit: creating variables and text styles…");
  KIT = await buildKit();

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  let first: PageNode | null = null;
  for (const [name, build] of PAGES) {
    figma.notify(`Grampro Kit: building ${name}…`);
    const page = await preparePage(name, stamp);
    await build(page);
    stackPage(page);
    first ??= page;
  }

  if (first) {
    await figma.setCurrentPageAsync(first);
    figma.viewport.scrollAndZoomIntoView(first.children);
  }
  const components = figma.root.children
    .filter((page) => PAGES.some(([name]) => name === page.name))
    .reduce((count, page) => count + page.findAllWithCriteria({ types: ["COMPONENT_SET"] }).length, 0);
  const darkNote = KIT.darkMode ? "Light + Dark modes" : "Light mode only (your plan allows one mode per collection)";
  figma.closePlugin(`Grampro Kit ready: ${COLOR_TOKENS.length + NUMBER_TOKENS.length} variables (${darkNote}), ${TYPE_TOKENS.length} text styles, ${components} component sets.`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  figma.closePlugin(`Grampro Kit failed: ${message}`);
});
