// Choice and quantity controls: Switch, Radio and RadioGroup, NumberInput.

async function buildControls(page: PageNode) {
  await buildSwitches(page);
  await buildRadios(page);
  await buildNumberInputs(page);
}

/* ------------------------------------------------------------------ Switch */

const SWITCH_SIZES: Record<SizeName, { width: number; height: number; gap: number }> = {
  sm: { width: 28, height: 16, gap: 2 },
  md: { width: 36, height: 20, gap: 3 },
  lg: { width: 44, height: 24, gap: 3 },
};

async function buildSwitches(page: PageNode) {
  const section = await docSection(
    page,
    "Switch",
    "component-lib/switch · <Switch checked label description size labelPosition loading readOnly>. A setting that takes effect as it is flipped, so there is no Save button under it — use a Checkbox when there is. Saving is the state after a press while the change is still in flight: the switch shows the new setting at once and puts itself back if the save fails.",
  );

  const variants: Variant[] = [];
  const add = (on: string, state: string, size: SizeName) =>
    variants.push({
      props: { On: on, State: state, Size: size },
      build: (component) => buildSwitchComponent(component, on === "True", state, size),
    });
  for (const on of ["False", "True"]) {
    for (const state of ["Default", "Hover", "Focus", "Disabled", "Saving"]) add(on, state, "md");
  }
  for (const size of ["sm", "lg"] as SizeName[]) {
    add("False", "Default", size);
    add("True", "Default", size);
  }

  const set = await variantSet(section, "Switch", "A setting that applies at once. Code: <Switch>.", variants, 5);
  textProperty(set, "Label", "Label", "Email notifications");
  textProperty(set, "Description", "Description", "About once a month.");
  booleanProperty(set, "Show description", "Description", false);

  const row = await exampleRow(section, "Example — a settings list (labelPosition=\"start\")");
  const list = frame("Settings", {
    direction: "column",
    gap: 12,
    padding: 16,
    fill: "surface/bg",
    stroke: "border/default",
    radius: "radius/md",
  }, row);
  applySize(list, 360, "hug");
  for (const [label, on] of [["Email notifications", "True"], ["Weekly digest", "True"], ["Product research invitations", "False"]]) {
    const line = frame(label, { direction: "row", justify: "between", align: "center" }, list);
    applySize(line, "fill", "hug");
    await text(line, label, "Body/Default");
    instance(line, set, { On: on, State: "Default", Size: "md" });
  }
}

async function buildSwitchComponent(component: ComponentNode, on: boolean, state: string, size: SizeName) {
  const { width, height, gap } = SWITCH_SIZES[size];
  applyLayout(component, { direction: "row", gap: 8, align: "start" });
  applySize(component, "hug", "hug");

  const track = frame("Track", {
    direction: "row",
    align: "center",
    justify: on ? "end" : "start",
    padding: gap,
    fill: on ? "accent/default" : "surface/subtle",
    radius: 999,
  }, component);
  applySize(track, width, height);
  if (state === "Focus") track.effects = [focusRing()];
  if (state === "Disabled") track.opacity = 0.5;

  const thumb = frame("Thumb", { direction: "none", fill: "surface/bg", radius: 999 }, track);
  applySize(thumb, height - gap * 2, height - gap * 2);
  thumb.effects = [shadow(1, 2, 0, 0.25)];
  // Saving: the thumb is a turning arc rather than a disc.
  if (state === "Saving") {
    setFill(thumb, null);
    icon(thumb, "spinnerArc", "accent/on-accent", height - gap * 2).name = "Spinner";
  }

  const copy = frame("Text", { direction: "column", gap: 1 }, component);
  const label = await text(copy, "Email notifications", CONTROL_SIZES[size].body, {
    color: state === "Disabled" ? "text/muted" : "text/primary",
  });
  label.name = "Label";
  (await text(copy, "About once a month.", "Body/Small", { color: "text/muted" })).name = "Description";
}

/* ------------------------------------------------------------------- Radio */

async function buildRadios(page: PageNode) {
  const section = await docSection(
    page,
    "Radio and RadioGroup",
    "component-lib/radio-group · <RadioGroup label options value orientation variant clearable> with <Radio value label description>. Native radios in code, so the group is one tab stop and the arrow keys move between the choices. A radio cannot be unselected, so an optional question needs either the clear button or a choice of its own.",
  );

  const variants: Variant[] = [];
  const add = (selected: string, state: string, size: SizeName) =>
    variants.push({
      props: { Selected: selected, State: state, Size: size },
      build: (component) => buildRadioComponent(component, selected === "True", state, size),
    });
  for (const selected of ["False", "True"]) {
    for (const state of ["Default", "Hover", "Focus", "Disabled", "Invalid"]) add(selected, state, "md");
  }
  for (const size of ["sm", "lg"] as SizeName[]) {
    add("False", "Default", size);
    add("True", "Default", size);
  }

  const set = await variantSet(section, "Radio", "One choice. Code: <Radio value label>.", variants, 5);
  textProperty(set, "Label", "Label", "Weekly");
  textProperty(set, "Description", "Description", "Every Monday morning.");
  booleanProperty(set, "Show description", "Description", false);

  const row = await exampleRow(section, "Example — a group, and the card variant");
  const group = frame("RadioGroup", { direction: "column", gap: 8 }, row);
  await text(group, "Send the report", "Label/Default");
  for (const [label, selected, state] of [["Daily", "False", "Default"], ["Weekly", "True", "Default"], ["Monthly", "False", "Default"], ["Hourly (needs an admin)", "False", "Disabled"]]) {
    const item = instance(group, set, { Selected: selected, State: state, Size: "md" });
    setInstanceText(item, "Label", label);
  }

  const cards = await variantSet(
    section,
    "Radio card",
    "A choice as a tile, for choices that need explaining. Code: <RadioGroup variant=\"card\">.",
    ["False", "True"].flatMap((selected) =>
      ["Default", "Hover", "Focus"].map((state) => ({
        props: { Selected: selected, State: state },
        build: (component: ComponentNode) => buildRadioCard(component, selected === "True", state),
      })),
    ),
    3,
  );
  textProperty(cards, "Label", "Label", "Team");
  textProperty(cards, "Description", "Description", "Unlimited projects and members");

  const tiles = frame("Plans", { direction: "row", gap: 8 }, row);
  for (const [label, description, selected] of [
    ["Starter", "Up to 3 projects", "False"],
    ["Team", "Unlimited projects and members", "True"],
  ]) {
    const tile = instance(tiles, cards, { Selected: selected, State: "Default" });
    setInstanceText(tile, "Label", label);
    setInstanceText(tile, "Description", description);
  }
}

async function buildRadioComponent(component: ComponentNode, selected: boolean, state: string, size: SizeName) {
  const box = { sm: 14, md: 16, lg: 20 }[size];
  applyLayout(component, { direction: "row", gap: 8, align: "start" });
  applySize(component, "hug", "hug");

  const control = frame("Button", {
    direction: "row",
    justify: "center",
    align: "center",
    fill: "surface/input",
    stroke: selected ? "accent/default" : state === "Invalid" ? "status/danger" : state === "Hover" ? "accent/default" : "border/control",
    strokeWeight: selected ? 2 : 1,
    radius: 999,
  }, component);
  applySize(control, box, box);
  control.strokeAlign = "INSIDE";
  if (selected) {
    const dot = frame("Dot", { direction: "none", fill: "accent/default", radius: 999 }, control);
    applySize(dot, box / 2, box / 2);
  }
  if (state === "Focus") control.effects = [focusRing()];
  if (state === "Disabled") control.opacity = 0.5;

  const copy = frame("Text", { direction: "column", gap: 1 }, component);
  const label = await text(copy, "Weekly", CONTROL_SIZES[size].body, {
    color: state === "Disabled" ? "text/muted" : "text/primary",
  });
  label.name = "Label";
  (await text(copy, "Every Monday morning.", "Body/Small", { color: "text/muted" })).name = "Description";
}

async function buildRadioCard(component: ComponentNode, selected: boolean, state: string) {
  applyLayout(component, {
    direction: "row",
    gap: 8,
    padding: 12,
    align: "start",
    fill: selected ? "accent/soft" : state === "Hover" ? "surface/hover" : "surface/input",
    stroke: selected ? "accent/default" : "border/default",
    radius: "radius/md",
  });
  applySize(component, 240, "hug");
  if (state === "Focus") component.effects = [focusRing()];

  const control = frame("Button", {
    direction: "row",
    justify: "center",
    align: "center",
    fill: "surface/input",
    stroke: selected ? "accent/default" : "border/control",
    strokeWeight: selected ? 2 : 1,
    radius: 999,
  }, component);
  applySize(control, 16, 16);
  control.strokeAlign = "INSIDE";
  if (selected) {
    const dot = frame("Dot", { direction: "none", fill: "accent/default", radius: 999 }, control);
    applySize(dot, 8, 8);
  }

  const copy = frame("Text", { direction: "column", gap: 1 }, component);
  applySize(copy, "fill", "hug");
  (await text(copy, "Team", "Label/Default", { width: "fill" })).name = "Label";
  // On the tinted background of a selected card, muted grey misses 4.5:1, so
  // the description sits a step darker there — as the stylesheet does.
  (await text(copy, "Unlimited projects and members", "Body/Small", {
    color: selected ? "text/primary" : "text/muted",
    width: "fill",
  })).name = "Description";
}

/* ------------------------------------------------------------- NumberInput */

async function buildNumberInputs(page: PageNode) {
  const section = await docSection(
    page,
    "NumberInput",
    "component-lib/number-input · <NumberInput value min max step decimals locale format currency stepper clearable>. A text field with role=\"spinbutton\", not <input type=\"number\">: the wheel cannot edit it by accident, a half-typed entry is still readable, and 1.234,56 and 1,234.56 are the same number in their own locales. Grouped and formatted at rest, plain while it has focus.",
  );

  const variants: Variant[] = [];
  for (const state of FIELD_STATES) {
    variants.push({
      props: { State: state, Size: "md" },
      build: (component) => buildNumberComponent(component, state, "md"),
    });
  }
  for (const size of ["sm", "lg"] as SizeName[]) {
    variants.push({ props: { State: "Default", Size: size }, build: (component) => buildNumberComponent(component, "Default", size) });
  }

  const set = await variantSet(section, "NumberInput", "Numeric field. Code: <NumberInput>.", variants, 5);
  textProperty(set, "Label", "Label", "Quantity");
  textProperty(set, "Value", "Value", "1,234.56");
  textProperty(set, "Hint", "Hint", "Between 1 and 99.");
  booleanProperty(set, "Stepper", "Stepper", true);
  booleanProperty(set, "Unit", "Unit", false);

  const row = await exampleRow(section, "Example — one amount, three locales (en-US, de-DE, fr-FR)");
  for (const [label, value] of [["Amount", "$1,234.56"], ["Betrag", "1.234,56 €"], ["Montant", "1 234,56"]]) {
    const field = instance(row, set, { State: "Filled", Size: "md" });
    setInstanceText(field, "Label", label);
    setInstanceText(field, "Value", value);
  }
}

async function buildNumberComponent(component: ComponentNode, state: string, size: SizeName) {
  const control = await fieldShell(component, 240, state, "Quantity");
  control.paddingRight = 0;
  applySize(control, "fill", CONTROL_HEIGHT[size]);

  const value = await text(control, state === "Default" ? "" : "1,234.56", CONTROL_SIZES[size].body, {
    color: state === "Default" ? "text/muted" : "text/primary",
  });
  value.name = "Value";
  applySize(value, "fill");

  const unit = await text(control, "kg", "Body/Small", { color: "text/muted" });
  unit.name = "Unit";

  // The spinner: two buttons in a column, divided from the field by a rule.
  const stepper = frame("Stepper", { direction: "column", stroke: "border/default" }, control);
  applySize(stepper, 22, "fill");
  stepper.strokeWeight = 0;
  stepper.strokeLeftWeight = 1;
  for (const [name, glyph] of [["Up", "chevronUp"], ["Down", "chevronDown"]] as const) {
    const button = frame(name, { direction: "row", justify: "center", align: "center" }, stepper);
    applySize(button, "fill", "fill");
    icon(button, glyph, "text/muted", 12);
  }

  await fieldFooter(component, state, "Between 1 and 99.");
}
