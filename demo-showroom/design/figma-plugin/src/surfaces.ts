// Menus and surfaces: Menu, Popover, Tooltip, Card, Stat, Skeleton, Empty state.

async function buildSurfaces(page: PageNode) {
  await buildMenu(page);
  await buildPopover(page);
  await buildTooltip(page);
  await buildCard(page);
  await buildStat(page);
  await buildSkeleton(page);
  await buildEmptyState(page);
}

/** A dashed placeholder for content a designer replaces, like the modal's. */
async function surfaceSlot(parent: FrameNode | ComponentNode, label: string, height: number) {
  const area = frame("Content slot", {
    direction: "row",
    justify: "center",
    align: "center",
    fill: "surface/subtle",
    stroke: "border/default",
    radius: "radius/md",
  }, parent);
  area.dashPattern = [4, 4];
  applySize(area, "fill", height);
  await text(area, label, "Body/Small", { color: "text/muted" });
}

/* -------------------------------------------------------------------- Menu */

async function buildMenu(page: PageNode) {
  const section = await docSection(
    page,
    "Menu",
    "component-lib/menu · <Menu trigger> with <MenuItem>, <MenuCheckboxItem>, <MenuRadioGroup>, <MenuGroup>, <MenuSeparator> and <MenuSub>. The panel is a native popover in the top layer, so it escapes overflow without a portal. Items are 6/8 px with a 5 px radius; the focused item is the highlighted one, so Hover and keyboard focus look the same. Checkbox and radio items keep a 14 px indicator column, which is why labels stay aligned as things are toggled.",
  );

  const KIND_ICON: Record<string, IconName> = {
    Default: "eye",
    Submenu: "download",
    Destructive: "trash",
  };

  const variants: Variant[] = [];
  for (const kind of ["Default", "Checkbox", "Radio", "Submenu", "Destructive"]) {
    for (const state of ["Default", "Hover", "Disabled"]) {
      variants.push({
        props: { Kind: kind, State: state },
        build: async (component) => {
          applyLayout(component, {
            direction: "row",
            gap: 8,
            padding: [6, 8],
            align: "center",
            fill: state === "Hover" ? "surface/hover" : null,
            radius: "radius/item",
          });
          applySize(component, 240, "hug");

          const disabled = state === "Disabled";
          const destructive = kind === "Destructive" && !disabled;
          const ink = disabled ? "text/muted" : destructive ? "status/danger" : "text/primary";

          if (kind === "Checkbox" || kind === "Radio") {
            const indicator = frame("Indicator", { direction: "row", justify: "center", align: "center" }, component);
            applySize(indicator, 14, 14);
            if (kind === "Checkbox") {
              icon(indicator, "check", disabled ? "text/muted" : "accent/default", 14);
            } else {
              const dot = frame("Dot", { direction: "none", fill: disabled ? "text/muted" : "accent/default", radius: 999 }, indicator);
              applySize(dot, 6, 6);
            }
          } else {
            // The icon inherits the item's color when the item is destructive.
            icon(component, KIND_ICON[kind], destructive ? "status/danger" : "text/muted", 16).name = "Icon";
          }

          const label = await text(component, "Duplicate", "Body/Default", { color: ink, truncate: true });
          label.name = "Label";
          applySize(label, "fill");

          if (kind === "Submenu") {
            icon(component, "chevronRight", "text/muted", 14).name = "Submenu arrow";
          } else {
            const shortcut = await text(component, "⌘D", "Body/Small", { color: "text/muted" });
            shortcut.name = "Shortcut";
          }
        },
      });
    }
  }

  const set = await variantSet(section, "Menu item", "One row of a menu. Code: <MenuItem icon shortcut destructive disabled>, <MenuCheckboxItem>, <MenuRadioItem>, <MenuSub>.", variants, 5);
  textProperty(set, "Label", "Label", "Duplicate");
  textProperty(set, "Shortcut", "Shortcut", "⌘D");
  booleanProperty(set, "Show icon", "Icon", true);
  booleanProperty(set, "Show shortcut", "Shortcut", false);

  const row = await exampleRow(section, "Example — a panel (min-width 180, 4 px padding, separators bleed to the edges)");
  const panel = frame("Menu", {
    direction: "column",
    padding: 4,
    fill: "surface/bg",
    stroke: "border/default",
    radius: "radius/md",
  }, row);
  panel.effects = [shadow(10, 30, -8, 0.18)];

  const groupLabel = await text(panel, "ACTIONS", "Label/Group", { color: "text/muted" });
  groupLabel.name = "Group label";
  const open = instance(panel, set, { Kind: "Default", State: "Default" });
  setInstanceText(open, "Label", "Open");
  const duplicate = instance(panel, set, { Kind: "Default", State: "Hover" });
  setInstanceText(duplicate, "Label", "Duplicate");
  const share = instance(panel, set, { Kind: "Submenu", State: "Default" });
  setInstanceText(share, "Label", "Share with…");

  const separator = frame("Separator", { direction: "none", fill: "border/default" }, panel);
  applySize(separator, "fill", 1);

  const remove = instance(panel, set, { Kind: "Destructive", State: "Default" });
  setInstanceText(remove, "Label", "Delete");
}

/* ----------------------------------------------------------------- Popover */

async function buildPopover(page: PageNode) {
  const section = await docSection(
    page,
    "Popover",
    "component-lib/popover · <Popover trigger title description side align width>. A native popover with light dismiss, 280 px wide by default, anchored to its trigger and flipped when it would leave the viewport. Unlike a tooltip it can hold focusable content: fields, links, buttons.",
  );

  const variants: Variant[] = [];
  for (const header of ["Title", "Title + description", "None"]) {
    variants.push({
      props: { Header: header },
      build: async (component) => {
        applyLayout(component, {
          direction: "column",
          fill: "surface/bg",
          stroke: "border/default",
          radius: "radius/md",
          clip: true,
        });
        component.effects = [shadow(10, 30, -8, 0.18)];
        applySize(component, 280, "hug");

        const panel = frame("Panel", { direction: "column", gap: 8, padding: 12 }, component);
        applySize(panel, "fill", "hug");

        if (header !== "None") {
          const head = frame("Header", { direction: "column", gap: 2 }, panel);
          applySize(head, "fill", "hug");
          (await text(head, "Filter results", "Label/Strong", { width: "fill" })).name = "Title";
          if (header === "Title + description") {
            (await text(head, "Narrow the list down to what you need.", "Body/Default", { color: "text/muted", width: "fill" })).name = "Description";
          }
        }

        const body = frame("Body", { direction: "column", gap: 8 }, panel);
        applySize(body, "fill", "hug");
        await surfaceSlot(body, "Popover content — swap for fields, links or a small form", 96);
      },
    });
  }

  const set = await variantSet(section, "Popover", "Anchored panel. Code: <Popover trigger title description>.", variants, 3);
  textProperty(set, "Title", "Title", "Filter results");
  textProperty(set, "Description", "Description", "Narrow the list down to what you need.");
}

/* ----------------------------------------------------------------- Tooltip */

async function buildTooltip(page: PageNode) {
  const section = await docSection(
    page,
    "Tooltip",
    "component-lib/tooltip · <Tooltip content side align delay>. A short label on hover or keyboard focus, inverted against the page, 5/8 px padding and at most 240 px wide. It holds no controls and is never the only place information appears — touch users never see it.",
  );

  const variants: Variant[] = [];
  for (const width of ["Auto", "Wrapped"]) {
    variants.push({
      props: { Width: width },
      build: async (component) => {
        applyLayout(component, {
          direction: "row",
          padding: [5, 8],
          align: "center",
          fill: "surface/tooltip",
          radius: "radius/md",
        });
        component.effects = [shadow(10, 30, -8, 0.18)];

        const body =
          width === "Auto"
            ? "Copy link"
            : "Only members with the Admin role can change billing details.";
        const label = await text(component, body, "Body/Small", { color: "text/on-tooltip" });
        label.name = "Label";
        if (width === "Wrapped") {
          applySize(component, 240, "hug");
          applySize(label, "fill");
        } else {
          applySize(component, "hug", "hug");
        }
      },
    });
  }

  const set = await variantSet(section, "Tooltip", "Hover or focus label. Code: <Tooltip content>.", variants, 2);
  textProperty(set, "Label", "Label", "Copy link");
}

/* -------------------------------------------------------------------- Card */

async function buildCard(page: PageNode) {
  const section = await docSection(
    page,
    "Card",
    "component-lib/card · <Card variant padding interactive> with <CardHeader title description actions>, <CardBody> and <CardFooter>. Outlined is the default; Elevated trades the border for a shadow and lifts 1 px on hover; Plain drops the background for a card inside a card. Padding sets --cd-px (sm 12, md 16, lg 24) and the header, body and footer all follow it.",
  );

  const PADDING: Record<string, number> = { sm: 12, md: 16, lg: 24 };

  const variants: Variant[] = [];
  for (const variant of ["Outlined", "Elevated", "Plain"]) {
    for (const padding of ["sm", "md", "lg"]) {
      variants.push({
        props: { Variant: variant, Padding: padding },
        build: async (component) => {
          const px = PADDING[padding];
          applyLayout(component, {
            direction: "column",
            fill: variant === "Plain" ? null : "surface/bg",
            stroke: variant === "Outlined" ? "border/default" : null,
            radius: "radius/md",
          });
          if (variant === "Elevated") component.effects = [shadow(10, 30, -8, 0.18)];
          applySize(component, 340, "hug");

          const header = frame("Header", { direction: "row", gap: 12, padding: [px, px, 0, px], align: "start" }, component);
          applySize(header, "fill", "hug");
          const heading = frame("Heading", { direction: "column", gap: 2 }, header);
          applySize(heading, "fill", "hug");
          (await text(heading, "Monthly revenue", "Title/Card", { width: "fill" })).name = "Title";
          (await text(heading, "Net of refunds and credits.", "Body/Default", { color: "text/muted", width: "fill" })).name = "Description";
          const actions = frame("Actions", { direction: "row", gap: 4, align: "center" }, header);
          icon(actions, "more", "text/muted", 16);

          // The header already spaces the top, so the body does not double it.
          const body = frame("Body", { direction: "column", gap: 8, padding: [12, px, px, px] }, component);
          applySize(body, "fill", "hug");
          await surfaceSlot(body, "Card content", 96);

          const footer = frame("Footer", { direction: "column" }, component);
          applySize(footer, "fill", "hug");
          const divider = frame("Divider", { direction: "none", fill: "border/default" }, footer);
          applySize(divider, "fill", 1);
          const footerRow = frame("Footer row", { direction: "row", gap: 8, padding: [12, px], align: "center" }, footer);
          applySize(footerRow, "fill", "hug");
          await text(footerRow, "Updated 2 minutes ago", "Body/Small", { color: "text/muted" });
        },
      });
    }
  }

  const set = await variantSet(section, "Card", "Surface for grouped content. Code: <Card variant padding interactive>.", variants, 3);
  textProperty(set, "Title", "Title", "Monthly revenue");
  textProperty(set, "Description", "Description", "Net of refunds and credits.");
  booleanProperty(set, "Show header", "Header", true);
  booleanProperty(set, "Show description", "Description", true);
  booleanProperty(set, "Show actions", "Actions", false);
  booleanProperty(set, "Show footer", "Footer", false);

  const row = await exampleRow(section, "Example — interactive card (hover fills with surface/hover, focus draws a 2 px ring offset 2 px)");
  const hover = instance(row, set, { Variant: "Outlined", Padding: "md" });
  setInstanceText(hover, "Title", "Interactive card");
  const focused = instance(row, set, { Variant: "Elevated", Padding: "md" });
  setInstanceText(focused, "Title", "Focused card");
  focused.effects = [shadow(10, 30, -8, 0.18), focusRing()];
}

/* -------------------------------------------------------------------- Stat */

async function buildStat(page: PageNode) {
  const section = await docSection(
    page,
    "Stat",
    "component-lib/card · <Stat label value trend help icon>. A single figure for a dashboard tile, usually inside a Card. The value is 1.9em with tabular figures so a row of tiles lines up. Color is a second signal only: the arrow and a visually hidden “Up” / “Down” carry the direction for anyone who cannot see the green or the red.",
  );

  const TREND: Record<string, { icon: IconName; color: string; change: string }> = {
    Up: { icon: "arrowUp", color: "status/success", change: "+12.5%" },
    Down: { icon: "arrowDown", color: "status/danger", change: "−3.8%" },
    Flat: { icon: "arrowFlat", color: "text/muted", change: "0.0%" },
  };

  const variants: Variant[] = [];
  for (const trend of ["Up", "Down", "Flat", "None"]) {
    variants.push({
      props: { Trend: trend },
      build: async (component) => {
        applyLayout(component, { direction: "column", gap: 4 });
        applySize(component, 240, "hug");

        const head = frame("Head", { direction: "row", gap: 8, align: "center" }, component);
        applySize(head, "fill", "hug");
        const label = await text(head, "Active users", "Label/Default", { color: "text/muted", truncate: true });
        label.name = "Label";
        applySize(label, "fill");
        icon(head, "users", "text/muted", 16).name = "Icon";

        (await text(component, "12,480", "Numeric/Stat", { width: "fill" })).name = "Value";

        if (trend !== "None") {
          const look = TREND[trend];
          const trendRow = frame("Trend", { direction: "row", gap: 4, align: "center" }, component);
          icon(trendRow, look.icon, look.color, 14);
          (await text(trendRow, look.change, "Label/Default", { color: look.color })).name = "Change";
          (await text(trendRow, "vs last month", "Body/Default", { color: "text/muted" })).name = "Trend description";
        }

        (await text(component, "Signed in at least once in the last 30 days", "Body/Small", { color: "text/muted", width: "fill" })).name = "Help";
      },
    });
  }

  const set = await variantSet(section, "Stat", "Dashboard figure. Code: <Stat label value trend help icon>.", variants, 4);
  textProperty(set, "Label", "Label", "Active users");
  textProperty(set, "Value", "Value", "12,480");
  textProperty(set, "Change", "Change", "+12.5%");
  textProperty(set, "Help", "Help", "Signed in at least once in the last 30 days");
  booleanProperty(set, "Show icon", "Icon", false);
  booleanProperty(set, "Show help", "Help", false);

  const row = await exampleRow(section, "Example — a row of tiles (each Stat inside a Card, padding md)");
  for (const [trend, label, value] of [
    ["Up", "Revenue", "$48,320"],
    ["Down", "Churn", "2.4%"],
    ["Flat", "Open tickets", "31"],
  ]) {
    const tile = frame(`Tile — ${label}`, {
      direction: "column",
      padding: 16,
      fill: "surface/bg",
      stroke: "border/default",
      radius: "radius/md",
    }, row);
    applySize(tile, 240, "hug");
    const stat = instance(tile, set, { Trend: trend });
    applySize(stat, "fill");
    setInstanceText(stat, "Label", label);
    setInstanceText(stat, "Value", value);
  }
}

/* ---------------------------------------------------------------- Skeleton */

async function buildSkeleton(page: PageNode) {
  const section = await docSection(
    page,
    "Skeleton",
    "component-lib/skeleton · <Skeleton variant lines lastLineWidth width height animation>. A placeholder shaped like the content it stands in for, so nothing jumps when the data lands. Text bars are sized from the font (0.85em, 4 px radius); circle and rect take the sizes you give them. The wave sheen and the pulse both stop under prefers-reduced-motion, which Figma cannot show — treat these as the resting state.",
  );

  const variants: Variant[] = [];
  for (const variant of ["Text", "Circle", "Rect"]) {
    variants.push({
      props: { Variant: variant },
      build: async (component) => {
        applyLayout(component, { direction: "column", gap: 8 });
        if (variant === "Text") {
          applySize(component, 240, "hug");
          for (const width of [240, 240, 144]) {
            const bar = frame("Bar", { direction: "none", fill: "surface/skeleton", radius: "radius/xs" }, component);
            applySize(bar, width, 11);
          }
        } else if (variant === "Circle") {
          applySize(component, 40, "hug");
          const bar = frame("Bar", { direction: "none", fill: "surface/skeleton", radius: 999 }, component);
          applySize(bar, 40, 40);
        } else {
          applySize(component, 240, "hug");
          const bar = frame("Bar", { direction: "none", fill: "surface/skeleton", radius: "radius/md" }, component);
          applySize(bar, 240, 80);
        }
      },
    });
  }

  const set = await variantSet(section, "Skeleton", "Loading placeholder. Code: <Skeleton variant lines>.", variants, 3);

  const row = await exampleRow(section, "Example — a loading card (one skeleton per real element, same sizes)");
  const card = frame("Loading card", {
    direction: "column",
    gap: 12,
    padding: 16,
    fill: "surface/bg",
    stroke: "border/default",
    radius: "radius/md",
  }, row);
  applySize(card, 340, "hug");
  const head = frame("Head", { direction: "row", gap: 12, align: "center" }, card);
  applySize(head, "fill", "hug");
  instance(head, set, { Variant: "Circle" });
  const lines = instance(head, set, { Variant: "Text" });
  applySize(lines, "fill");
  instance(card, set, { Variant: "Rect" });
}

/* ------------------------------------------------------------- Empty state */

async function buildEmptyState(page: PageNode) {
  const section = await docSection(
    page,
    "Empty state",
    "component-lib/skeleton · <Empty title description icon actions size>. What a list shows when it has nothing to show: say what would be here and give one way forward. Sizes set the padding (sm 24/16, md 40/24, lg 64/24) — sm sits inside a card or a panel, lg fills a page.",
  );

  const SIZE: Record<string, { padding: [number, number]; icon: number; title: string }> = {
    sm: { padding: [24, 16], icon: 24, title: "Title/Card" },
    md: { padding: [40, 24], icon: 32, title: "Title/Card" },
    lg: { padding: [64, 24], icon: 40, title: "Title/Dialog" },
  };

  const variants: Variant[] = [];
  for (const size of ["sm", "md", "lg"]) {
    variants.push({
      props: { Size: size },
      build: async (component) => {
        const look = SIZE[size];
        applyLayout(component, { direction: "column", gap: 6, padding: look.padding, align: "center" });
        applySize(component, 460, "hug");

        const iconWrap = frame("Icon", { direction: "row", justify: "center", align: "center" }, component);
        applySize(iconWrap, look.icon, look.icon);
        icon(iconWrap, "inbox", "text/muted", look.icon);

        const title = await text(component, "No invoices yet", look.title, { align: "CENTER", width: "fill" });
        title.name = "Title";
        const description = await text(
          component,
          "Invoices appear here once you send your first one. They stay for seven years.",
          "Body/Default",
          { color: "text/muted", align: "CENTER", width: "fill" },
        );
        description.name = "Description";

        const actions = frame("Actions", { direction: "row", gap: 8, justify: "center", align: "center" }, component);
        applySize(actions, "fill", "hug");
        const primary = frame("Primary action", { direction: "row", padding: [0, 14], align: "center", fill: "accent/default", radius: "radius/md" }, actions);
        applySize(primary, "hug", 36);
        bindNumber(primary, "height", "control/height-md");
        await text(primary, "New invoice", "Label/Default", { color: "accent/on-accent" });
      },
    });
  }

  const set = await variantSet(section, "Empty state", "Nothing-here state. Code: <Empty title description icon actions size>.", variants, 3);
  textProperty(set, "Title", "Title", "No invoices yet");
  textProperty(set, "Description", "Description", "Invoices appear here once you send your first one. They stay for seven years.");
  booleanProperty(set, "Show icon", "Icon", true);
  booleanProperty(set, "Show actions", "Actions", true);
}
