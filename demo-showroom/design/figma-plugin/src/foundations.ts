// The Foundations page: colors in both modes, type, radius and spacing.

async function buildFoundations(page: PageNode) {
  await docSection(
    page,
    "Grampro Kit — design system",
    [
      "Generated from the React component library (component-lib). Every color, radius and size here is a variable, and every component is bound to them, so switching a frame between Light and Dark (Appearance → variable mode) restyles it the way data-theme does in code.",
      "Tokens map one-to-one to the CSS variables in each component's styles.css; each variable's description names its CSS counterpart. When the code changes, update src/tokens.ts and run the plugin again: it updates variables and styles in place.",
    ].join("\n\n"),
  );

  await buildColorSection(page);
  await buildTypeSection(page);
  await buildShapeSection(page);
}

async function buildColorSection(page: PageNode) {
  const section = await docSection(
    page,
    "Color",
    "Variables in the “Grampro Kit · Color” collection, shown in each mode. Surface and accent tokens can fill anything; text tokens apply to text only and border tokens to strokes only, so the picker offers the right ones.",
  );
  const row = frame("Modes", { direction: "row", gap: 24, align: "start" }, section);

  const modes: [string, string | null, "light" | "dark"][] = [
    ["Light", KIT.lightMode, "light"],
    ["Dark", KIT.darkMode, "dark"],
  ];
  for (const [label, modeId, key] of modes) {
    if (!modeId) continue;
    const panel = frame(`${label} mode`, {
      direction: "column",
      gap: 20,
      padding: 24,
      fill: "surface/bg",
      stroke: "border/default",
      radius: "radius/lg",
    }, row);
    panel.setExplicitVariableModeForCollection(KIT.colorCollection, modeId);
    applySize(panel, 652, "hug");
    await text(panel, `${label} mode`, "Title/Dialog");

    const groups = new Map<string, ColorToken[]>();
    for (const token of COLOR_TOKENS) {
      const group = token.name.split("/")[0];
      groups.set(group, [...(groups.get(group) ?? []), token]);
    }
    for (const [group, tokens] of groups) {
      await text(panel, capitalize(group), "Label/Strong", { color: "text/muted" });
      const grid = frame(group, { direction: "row", gap: 12, wrap: true }, panel);
      applySize(grid, "fill", "hug");
      grid.counterAxisSpacing = 12;
      for (const token of tokens) {
        const swatch = frame(token.name, { direction: "column", gap: 4 }, grid);
        applySize(swatch, 140, "hug");
        const chip = frame("chip", { direction: "none", fill: token.name, stroke: "border/default", radius: "radius/md" }, swatch);
        applySize(chip, 140, 48);
        await text(swatch, token.name, "Label/Small", { width: "fill" });
        await text(swatch, key === "light" ? token.light : token.dark, "Body/Small", { color: "text/muted" });
      }
    }
  }
}

async function buildTypeSection(page: PageNode) {
  const section = await docSection(
    page,
    "Type",
    `Text styles under “Grampro Kit/”. ${TYPE_FAMILY} stands in for the system-ui stack the components use in browsers. Turn on tabular figures (Type settings → Details) for numbers that line up: counters, cells, OTP codes.`,
  );
  const list = frame("Styles", { direction: "column", gap: 12 }, section);
  applySize(list, "fill", "hug");
  for (const token of TYPE_TOKENS) {
    const row = frame(token.name, {
      direction: "row",
      gap: 24,
      padding: [12, 16],
      fill: "surface/bg",
      stroke: "border/subtle",
      radius: "radius/md",
    }, list);
    applySize(row, "fill", "hug");
    const name = await text(row, token.name, "Label/Default", { color: "text/muted" });
    applySize(name, 180);
    const sample = await text(row, "The quick brown fox jumps over 1,234 lazy dogs", token.name);
    applySize(sample, "fill");
    await text(row, `${token.size}/${token.lineHeight} · ${token.weight} — ${token.description}`, "Body/Small", {
      color: "text/muted",
    });
  }
}

async function buildShapeSection(page: PageNode) {
  const section = await docSection(
    page,
    "Radius, control heights and spacing",
    "Variables in the “Grampro Kit · Size” collection. Bind corner radius, height and gaps to them instead of typing numbers, so a future change to the scale flows through.",
  );

  const radii = frame("Radius", { direction: "row", gap: 24, align: "end" }, section);
  for (const token of NUMBER_TOKENS.filter((item) => item.name.startsWith("radius/"))) {
    const cell = frame(token.name, { direction: "column", gap: 6, align: "center" }, radii);
    const square = frame("shape", { direction: "none", fill: "accent/soft", stroke: "accent/default", radius: token.name }, cell);
    applySize(square, 72, 72);
    await text(cell, `${token.name} · ${token.value}`, "Body/Small", { color: "text/muted" });
  }

  const heights = frame("Control heights", { direction: "row", gap: 24, align: "end" }, section);
  for (const token of NUMBER_TOKENS.filter((item) => item.name.startsWith("control/"))) {
    const cell = frame(token.name, { direction: "column", gap: 6, align: "center" }, heights);
    const bar = frame("height", { direction: "none", fill: "surface/subtle", stroke: "border/default", radius: "radius/md" }, cell);
    applySize(bar, 120, token.value);
    bindNumber(bar, "height", token.name);
    await text(cell, `${token.name} · ${token.value}px`, "Body/Small", { color: "text/muted" });
  }

  const spacing = frame("Spacing", { direction: "column", gap: 8 }, section);
  for (const token of NUMBER_TOKENS.filter((item) => item.name.startsWith("space/"))) {
    const row = frame(token.name, { direction: "row", gap: 12 }, spacing);
    const label = await text(row, `${token.name} · ${token.value}`, "Body/Small", { color: "text/muted" });
    applySize(label, 140);
    const bar = frame("size", { direction: "none", fill: "accent/default", radius: 2 }, row);
    applySize(bar, Math.max(2, token.value * 4), 8);
    if (token.description) await text(row, token.description, "Body/Small", { color: "text/muted" });
  }
}
