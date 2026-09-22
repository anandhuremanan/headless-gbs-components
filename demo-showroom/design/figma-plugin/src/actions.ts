// Actions and navigation: Button, Icon button, Spinner, Checkbox, Tabs, Breadcrumb.

type ButtonVariantName = "Primary" | "Secondary" | "Outline" | "Ghost" | "Danger" | "Link";
type SizeName = "sm" | "md" | "lg";

const BUTTON_LOOK: Record<ButtonVariantName, { fill: string | null; hover: string | null; ink: string; line: string | null }> = {
  Primary: { fill: "accent/default", hover: "accent/strong", ink: "accent/on-accent", line: null },
  Secondary: { fill: "surface/subtle", hover: "surface/hover", ink: "text/primary", line: null },
  Outline: { fill: "surface/bg", hover: "surface/hover", ink: "text/primary", line: "border/default" },
  Ghost: { fill: null, hover: "surface/hover", ink: "text/primary", line: null },
  Danger: { fill: "status/danger", hover: "status/danger", ink: "status/on-danger", line: null },
  Link: { fill: null, hover: null, ink: "accent/default", line: null },
};

const CONTROL_SIZES: Record<SizeName, { height: string; px: number; gap: number; label: string; body: string; icon: number }> = {
  sm: { height: "control/height-sm", px: 10, gap: 6, label: "Label/Small", body: "Body/Small", icon: 14 },
  md: { height: "control/height-md", px: 14, gap: 8, label: "Label/Default", body: "Body/Default", icon: 16 },
  lg: { height: "control/height-lg", px: 18, gap: 10, label: "Label/Large", body: "Body/Large", icon: 18 },
};

/** Auto-width, token-height component: the usual shape of a control. */
const CONTROL_HEIGHT: Record<SizeName, number> = { sm: 30, md: 36, lg: 44 };

function controlShape(node: ComponentNode | FrameNode, size: SizeName, width: Size = "hug") {
  applySize(node, width, CONTROL_HEIGHT[size]);
  bindNumber(node, "height", CONTROL_SIZES[size].height);
}

async function buildActions(page: PageNode) {
  await buildButtons(page);
  await buildSpinners(page);
  await buildCheckboxes(page);
  await buildTabs(page);
  await buildBreadcrumbs(page);
}

/* ------------------------------------------------------------------ Button */

async function buildButtons(page: PageNode) {
  const section = await docSection(
    page,
    "Button",
    "component-lib/button · <Button variant size loading leading trailing icon fullWidth>. States mirror the CSS: Hover, Focus (keyboard focus ring), Disabled (50% opacity) and Loading (spinner; in code the label keeps its width). Link renders without padding. Use the Label text property and the Leading/Trailing icon toggles; swap the icons for your own.",
  );

  const variants: Variant[] = [];
  const names = Object.keys(BUTTON_LOOK) as ButtonVariantName[];
  const add = (variant: ButtonVariantName, size: SizeName, state: string) =>
    variants.push({
      props: { Variant: variant, Size: size, State: state },
      build: (component) => buildButtonComponent(component, variant, size, state),
    });
  for (const variant of names) {
    for (const state of ["Default", "Hover", "Focus", "Disabled", "Loading"]) add(variant, "md", state);
  }
  for (const variant of names) {
    add(variant, "sm", "Default");
    add(variant, "lg", "Default");
  }

  const set = await variantSet(section, "Button", "Actions. Code: <Button variant size loading>.", variants, 5);
  textProperty(set, "Label", "Label", "Button");
  booleanProperty(set, "Leading icon", "Leading icon", false);
  booleanProperty(set, "Trailing icon", "Trailing icon", false);

  const icons: Variant[] = [];
  for (const variant of ["Primary", "Secondary", "Outline", "Ghost", "Danger"] as ButtonVariantName[]) {
    for (const size of ["sm", "md", "lg"] as SizeName[]) {
      icons.push({
        props: { Variant: variant, Size: size },
        build: async (component) => {
          const look = BUTTON_LOOK[variant];
          applyLayout(component, { direction: "row", justify: "center", align: "center", fill: look.fill, stroke: look.line, radius: "radius/md" });
          const side = { sm: 30, md: 36, lg: 44 }[size];
          applySize(component, side, side);
          icon(component, "plus", look.ink, CONTROL_SIZES[size].icon).name = "Icon";
        },
      });
    }
  }
  await variantSet(section, "Icon button", "Icon-only button. Code: <Button icon={…} aria-label=\"…\"> — always give it an accessible name.", icons, 3);
}

async function buildButtonComponent(component: ComponentNode, variant: ButtonVariantName, size: SizeName, state: string) {
  const look = BUTTON_LOOK[variant];
  const dims = CONTROL_SIZES[size];
  const link = variant === "Link";
  const fill = state === "Hover" ? (look.hover ?? look.fill) : look.fill;

  applyLayout(component, {
    direction: "row",
    gap: dims.gap,
    padding: link ? 0 : [0, dims.px],
    justify: "center",
    align: "center",
    fill,
    stroke: look.line,
    radius: "radius/md",
  });
  if (link) applySize(component, "hug", "hug");
  else controlShape(component, size);

  if (state === "Loading") icon(component, "spinnerArc", look.ink, dims.icon).name = "Spinner";
  icon(component, "plus", look.ink, dims.icon).name = "Leading icon";
  const label = await text(component, "Button", dims.label, { color: look.ink });
  label.name = "Label";
  if (link && state === "Hover") label.textDecoration = "UNDERLINE";
  icon(component, "chevronRight", look.ink, dims.icon).name = "Trailing icon";

  if (state === "Focus") component.effects = [focusRing()];
  if (state === "Disabled") component.opacity = 0.5;
}

/* ----------------------------------------------------------------- Spinner */

async function buildSpinners(page: PageNode) {
  const section = await docSection(
    page,
    "Spinner",
    "component-lib/spinner · <Spinner size variant label delay minDuration>. In code the spinner takes the current text color; here it uses accent/default — override the stroke to match. Wrapping content in <Spinner loading> covers it with surface/bg at 72% and makes it inert.",
  );

  const sizes: [string, number][] = [["xs", 12], ["sm", 16], ["md", 24], ["lg", 32], ["xl", 48]];
  const variants: Variant[] = [];
  for (const kind of ["Ring", "Dots"]) {
    for (const [name, px] of sizes) {
      variants.push({
        props: { Variant: kind, Size: name },
        build: async (component) => {
          applyLayout(component, { direction: "none" });
          component.resizeWithoutConstraints(px, px);
          if (kind === "Ring") {
            const track = figma.createEllipse();
            track.name = "Track";
            component.appendChild(track);
            track.resize(px * (19 / 24), px * (19 / 24));
            track.x = px * (2.5 / 24);
            track.y = px * (2.5 / 24);
            track.fills = [];
            setStroke(track, "border/default", Math.max(1, px * (2.5 / 24)));
            const arc = icon(component, "spinnerArc", "accent/default", px);
            arc.name = "Arc";
          } else {
            const dot = px * 0.22;
            const gap = (px - dot * 3) / 2;
            [0.3, 0.65, 1].forEach((opacity, index) => {
              const circle = figma.createEllipse();
              circle.name = `Dot ${index + 1}`;
              component.appendChild(circle);
              circle.resize(dot, dot);
              circle.x = index * (dot + gap);
              circle.y = (px - dot) / 2;
              setFill(circle, "accent/default");
              circle.opacity = opacity;
            });
          }
        },
      });
    }
  }
  await variantSet(section, "Spinner", "Loading indicator. Code: <Spinner size variant>.", variants, 5);
}

/* ---------------------------------------------------------------- Checkbox */

async function buildCheckboxes(page: PageNode) {
  const section = await docSection(
    page,
    "Checkbox",
    "component-lib/checkbox · <Checkbox checked=\"true | false | indeterminate\" label description error size> and <CheckboxGroup options selectAll orientation>. The box is a native input in code, so Focus is the keyboard focus ring. Toggle the Description layer with its property.",
  );

  const variants: Variant[] = [];
  const add = (checked: string, interaction: string, size: SizeName) =>
    variants.push({
      props: { Checked: checked, State: interaction, Size: size },
      build: (component) => buildCheckboxComponent(component, checked, interaction, size),
    });
  for (const checked of ["False", "True", "Indeterminate"]) {
    for (const interaction of ["Default", "Hover", "Focus", "Disabled", "Invalid"]) add(checked, interaction, "md");
  }
  for (const size of ["sm", "lg"] as SizeName[]) {
    add("False", "Default", size);
    add("True", "Default", size);
  }
  const set = await variantSet(section, "Checkbox", "Single checkbox with label. Code: <Checkbox>.", variants, 5);
  textProperty(set, "Label", "Label", "Email me about new features");
  textProperty(set, "Description", "Description", "About once a month.");
  booleanProperty(set, "Show description", "Description", false);

  // A group, built from instances.
  const row = await exampleRow(section, "Example — CheckboxGroup with select all");
  const group = frame("CheckboxGroup", { direction: "column", gap: 8 }, row);
  await text(group, "Notify me by", "Label/Default");
  const all = instance(group, set, { Checked: "Indeterminate", State: "Default", Size: "md" });
  setInstanceText(all, "Label", "Select all");
  const items = frame("Items", { direction: "column", gap: 8, padding: [0, 0, 0, 24] }, group);
  for (const [label, checked, state] of [["Email", "True", "Default"], ["SMS", "False", "Default"], ["Push", "True", "Default"], ["Slack (needs an admin)", "False", "Disabled"]]) {
    const item = instance(items, set, { Checked: checked, State: state, Size: "md" });
    setInstanceText(item, "Label", label);
  }
}

async function buildCheckboxComponent(component: ComponentNode, checked: string, interaction: string, size: SizeName) {
  const box = { sm: 14, md: 16, lg: 20 }[size];
  const on = checked !== "False";
  applyLayout(component, { direction: "row", gap: 8, align: "start" });
  applySize(component, "hug", "hug");

  const control = frame("Box", {
    direction: "row",
    justify: "center",
    align: "center",
    fill: on ? "accent/default" : "surface/input",
    stroke: on ? "accent/default" : interaction === "Invalid" ? "status/danger" : interaction === "Hover" ? "text/muted" : "border/control",
    strokeWeight: 1.5,
    radius: "radius/xs",
  }, component);
  applySize(control, box, box);
  control.strokeAlign = "INSIDE";
  if (checked === "True") icon(control, "check", "accent/on-accent", box * 0.75).name = "Check";
  if (checked === "Indeterminate") icon(control, "minus", "accent/on-accent", box * 0.75).name = "Dash";
  if (interaction === "Focus") control.effects = [focusRing()];

  const copy = frame("Text", { direction: "column", gap: 1 }, component);
  const label = await text(copy, "Email me about new features", CONTROL_SIZES[size].body, {
    color: interaction === "Disabled" ? "text/muted" : "text/primary",
  });
  label.name = "Label";
  const description = await text(copy, "About once a month.", "Body/Small", { color: "text/muted" });
  description.name = "Description";
  if (interaction === "Invalid") {
    (await text(copy, "Please accept to continue.", "Body/Small", { color: "status/danger" })).name = "Error";
  }
  if (interaction === "Disabled") control.opacity = 0.5;
}

/* -------------------------------------------------------------------- Tabs */

async function buildTabs(page: PageNode) {
  const section = await docSection(
    page,
    "Tabs",
    "component-lib/tabs · <Tabs variant orientation><TabList><Tab value badge icon/></TabList><TabPanel/></Tabs>. Three looks: Line (sliding underline), Pills and Enclosed (segmented control). Build a tab list from instances as in the examples; in code the indicator slides between tabs.",
  );

  const variants: Variant[] = [];
  for (const look of ["Line", "Pills", "Enclosed"]) {
    for (const state of ["Default", "Hover", "Selected", "Focus", "Disabled"]) {
      variants.push({ props: { Variant: look, State: state }, build: (component) => buildTabComponent(component, look, state) });
    }
  }
  const set = await variantSet(section, "Tab", "One tab. Code: <Tab value badge>.", variants, 5);
  textProperty(set, "Label", "Label", "Overview");
  textProperty(set, "Badge", "Badge text", "3");
  booleanProperty(set, "Show badge", "Badge", false);

  const row = await exampleRow(section, "Examples — tab lists");
  const labels = ["Overview", "Activity", "Settings", "Billing"];
  const states = ["Selected", "Default", "Default", "Disabled"];
  for (const look of ["Line", "Pills", "Enclosed"]) {
    const list = frame(`${look} tab list`, {
      direction: "row",
      gap: look === "Line" ? 0 : 2,
      padding: look === "Enclosed" ? 3 : 0,
      fill: look === "Enclosed" ? "surface/subtle" : null,
      radius: look === "Enclosed" ? "radius/md" : 0,
      align: "end",
    }, row);
    if (look === "Line") {
      setStroke(list, "border/default");
      list.strokeTopWeight = 0;
      list.strokeLeftWeight = 0;
      list.strokeRightWeight = 0;
      list.strokeBottomWeight = 1;
    }
    labels.forEach((label, index) => {
      const tab = instance(list, set, { Variant: look, State: states[index] });
      setInstanceText(tab, "Label", label);
    });
  }
}

async function buildTabComponent(component: ComponentNode, look: string, state: string) {
  const selected = state === "Selected";
  // Unselected tabs use text/tab, not text/muted: a tab is a control, and the
  // strip usually sits on the page background rather than on a white card.
  const ink = look === "Pills" && selected ? "accent/default" : selected || state === "Hover" ? "text/primary" : "text/tab";

  if (look === "Line") {
    applyLayout(component, { direction: "column", align: "center" });
    applySize(component, "hug", "hug");
    const content = frame("Content", { direction: "row", gap: 6, padding: [0, 12], align: "center" }, component);
    applySize(content, "hug", 36);
    await tabContent(content, ink, selected);
    const indicator = frame("Indicator", { direction: "none", fill: selected ? "accent/default" : null, radius: 2 }, component);
    applySize(indicator, "fill", 2);
  } else {
    applyLayout(component, {
      direction: "row",
      gap: 6,
      padding: [0, 12],
      align: "center",
      radius: "radius/sm",
      fill: look === "Pills"
        ? selected ? "accent/soft" : state === "Hover" ? "surface/hover" : null
        : selected ? "surface/bg" : null,
    });
    applySize(component, "hug", look === "Enclosed" ? 30 : 36);
    if (look === "Enclosed" && selected) component.effects = [shadow(1, 3, 0, 0.12)];
    await tabContent(component, ink, selected);
  }
  if (state === "Focus") component.effects = [...component.effects, focusRing()];
  if (state === "Disabled") component.opacity = 0.45;
}

async function tabContent(parent: FrameNode | ComponentNode, ink: string, selected: boolean) {
  (await text(parent, "Overview", "Label/Default", { color: ink })).name = "Label";
  const badge = frame("Badge", { direction: "row", padding: [1, 6], radius: "radius/full", fill: selected ? "accent/soft" : "surface/hover" }, parent);
  (await text(badge, "3", "Label/Small", { color: selected ? "accent/default" : "text/muted" })).name = "Badge text";
}

/* -------------------------------------------------------------- Breadcrumb */

async function buildBreadcrumbs(page: PageNode) {
  const section = await docSection(
    page,
    "Breadcrumb",
    "component-lib/breadcrumb · <Breadcrumb items maxItems renderLink structuredData>. The last item is the current page (not a link). Long trails collapse behind the Ellipsis item; labels longer than 24 characters are cut with an ellipsis.",
  );

  const variants: Variant[] = [];
  for (const kind of ["Link", "Current", "Ellipsis"]) {
    for (const state of kind === "Current" ? ["Default"] : ["Default", "Hover", "Focus"]) {
      variants.push({
        props: { Type: kind, State: state },
        build: async (component) => {
          if (kind === "Ellipsis") {
            applyLayout(component, { direction: "row", justify: "center", align: "center", radius: "radius/xs", fill: state === "Hover" ? "surface/hover" : null });
            applySize(component, 24, 22);
            await text(component, "…", "Label/Default", { color: state === "Hover" ? "text/primary" : "text/muted" });
          } else {
            applyLayout(component, { direction: "row", gap: 5, padding: [2, 4], align: "center", radius: "radius/xs" });
            applySize(component, "hug", "hug");
            const current = kind === "Current";
            const color = current || state === "Hover" ? "text/primary" : "text/muted";
            icon(component, "home", color, 14).name = "Icon";
            const label = await text(component, current ? "INV-2026-0042" : "Invoices", current ? "Label/Default" : "Body/Default", { color });
            label.name = "Label";
            if (state === "Hover") label.textDecoration = "UNDERLINE";
          }
          if (state === "Focus") component.effects = [focusRing()];
        },
      });
    }
  }
  const set = await variantSet(section, "Breadcrumb item", "One crumb. Code: an item in <Breadcrumb items>.", variants, 3);
  textProperty(set, "Label", "Label", "Invoices");
  booleanProperty(set, "Show icon", "Icon", false);

  const separator = figma.createComponent();
  separator.name = "Breadcrumb separator";
  section.appendChild(separator);
  applyLayout(separator, { direction: "row", align: "center" });
  applySize(separator, "hug", "hug");
  icon(separator, "chevronRight", "text/muted", 14);
  separator.opacity = 0.7;

  for (const [label, crumbs] of [
    ["Example — full trail", ["Home", "Workspaces", "Finance", "Invoices", "INV-2026-0042"]],
    ["Example — collapsed (maxItems={3})", ["Home", "…", "Invoices", "INV-2026-0042"]],
  ] as [string, string[]][]) {
    const row = await exampleRow(section, label);
    const trail = frame("Breadcrumb", { direction: "row", gap: 6, align: "center" }, row);
    crumbs.forEach((crumb, index) => {
      if (index > 0) trail.appendChild(separator.createInstance());
      const last = index === crumbs.length - 1;
      const node = instance(trail, set, crumb === "…" ? { Type: "Ellipsis", State: "Default" } : { Type: last ? "Current" : "Link", State: "Default" });
      if (crumb !== "…") setInstanceText(node, "Label", crumb);
    });
  }
}
