// Status and identity: Alert, Badge and Tag, Avatar, Progress, Accordion.

async function buildDisplay(page: PageNode) {
  await buildAlerts(page);
  await buildBadges(page);
  await buildAvatars(page);
  await buildProgress(page);
  await buildAccordions(page);
}

/* ------------------------------------------------------------------- Alert */

const ALERT_VARIANTS: Record<string, { color: string; icon: IconName; title: string; body: string }> = {
  Info: {
    color: "status/info",
    icon: "info",
    title: "Read-only workspace",
    body: "You have view access to this project. Ask an owner for edit rights.",
  },
  Success: {
    color: "status/success",
    icon: "success",
    title: "Import finished",
    body: "240 rows were added to Customers.",
  },
  Warning: {
    color: "status/warning",
    icon: "warning",
    title: "Your trial ends in 3 days",
    body: "After that the workspace becomes read-only.",
  },
  Danger: {
    color: "status/danger",
    icon: "danger",
    title: "We could not save your changes",
    body: "The connection dropped. Your edits are still here.",
  },
  Neutral: {
    color: "text/muted",
    icon: "info",
    title: "Scheduled maintenance",
    body: "Sunday 02:00–04:00 UTC.",
  },
};

async function buildAlerts(page: PageNode) {
  const section = await docSection(
    page,
    "Alert",
    "component-lib/alert · <Alert variant size title description actions onDismiss icon>. A message that stays in the page, unlike a Dialog (which blocks) and a Toast (which leaves). Danger and Warning interrupt a screen reader; the rest wait their turn. The tint is the variant colour mixed 7% into the surface, so a themed accent carries through without a second token.",
  );

  const variants: Variant[] = [];
  for (const [name, look] of Object.entries(ALERT_VARIANTS)) {
    for (const size of ["md", "sm"]) {
      variants.push({
        props: { Variant: name, Size: size },
        build: async (component) => {
          const small = size === "sm";
          applyLayout(component, {
            direction: "row",
            gap: small ? 8 : 10,
            padding: small ? [8, 10] : [12, 14],
            align: "start",
            fill: "surface/bg",
            stroke: "border/default",
            radius: "radius/md",
          });
          applySize(component, 460, "hug");

          // The variant's bar: a 3px edge rather than a border on all sides.
          const bar = frame("Variant bar", { direction: "none", fill: look.color }, component);
          bar.layoutPositioning = "ABSOLUTE";
          bar.resize(3, 100);
          bar.x = 0;
          bar.y = 0;
          bar.constraints = { horizontal: "MIN", vertical: "STRETCH" };

          icon(component, look.icon, look.color, small ? 14 : 16).name = "Icon";

          const content = frame("Content", { direction: "column", gap: 2 }, component);
          applySize(content, "fill", "hug");
          (await text(content, look.title, small ? "Label/Small" : "Label/Strong", { width: "fill" })).name = "Title";
          (await text(content, look.body, small ? "Body/Small" : "Body/Default", { width: "fill" })).name = "Description";

          const actions = frame("Actions", { direction: "row", gap: 8, align: "center" }, content);
          const button = frame("Action", { direction: "row", padding: [0, 10], align: "center", radius: "radius/sm", stroke: "border/default" }, actions);
          applySize(button, "hug", 28);
          await text(button, "Add a card", "Label/Small");

          icon(component, "x", "text/muted", 14).name = "Dismiss";
        },
      });
    }
  }

  const set = await variantSet(section, "Alert", "In-page message. Code: <Alert variant title>.", variants, 5);
  textProperty(set, "Title", "Title", "Your trial ends in 3 days");
  textProperty(set, "Description", "Description", "After that the workspace becomes read-only.");
  booleanProperty(set, "Show description", "Description", true);
  booleanProperty(set, "Show icon", "Icon", true);
  booleanProperty(set, "Show actions", "Actions", false);
  booleanProperty(set, "Dismissible", "Dismiss", false);
}

/* ------------------------------------------------------------- Badge & Tag */

const BADGE_VARIANTS: Record<string, string> = {
  Neutral: "text/primary",
  Accent: "accent/default",
  Success: "status/success",
  Warning: "status/warning",
  Danger: "status/danger",
};

async function buildBadges(page: PageNode) {
  const section = await docSection(
    page,
    "Badge and Tag",
    "component-lib/badge · <Badge variant appearance size count dot icon> and <Tag onRemove>. A Badge is static text; a Tag comes off. A count stops at 99+ and reads aloud as “more than 99”, and a count of zero is left off the page entirely unless showZero asks for it.",
  );

  const variants: Variant[] = [];
  for (const [name, color] of Object.entries(BADGE_VARIANTS)) {
    for (const appearance of ["Soft", "Solid", "Outline"]) {
      variants.push({
        props: { Variant: name, Appearance: appearance },
        build: (component) => buildBadgeComponent(component, name, color, appearance),
      });
    }
  }

  const set = await variantSet(section, "Badge", "Static label or count. Code: <Badge variant appearance>.", variants, 5);
  textProperty(set, "Label", "Label", "Active");
  booleanProperty(set, "Status dot", "Dot", false);

  const tags = await variantSet(
    section,
    "Tag",
    "A chip the user can take off. Code: <Tag onRemove>.",
    ["Neutral", "Accent", "Danger"].map((name) => ({
      props: { Variant: name },
      build: (component: ComponentNode) => buildTagComponent(component, BADGE_VARIANTS[name]),
    })),
    3,
  );
  textProperty(tags, "Label", "Label", "Berlin");

  const row = await exampleRow(section, "Example — a row of filters, and a counter on a tab");
  const chips = frame("Filters", { direction: "row", gap: 6 }, row);
  for (const city of ["Berlin", "Paris", "Rome"]) {
    const tag = instance(chips, tags, { Variant: "Neutral" });
    setInstanceText(tag, "Label", city);
  }
}

async function buildBadgeComponent(
  component: ComponentNode,
  variant: string,
  color: string,
  appearance: string,
) {
  const solid = appearance === "Solid";
  const outline = appearance === "Outline";
  applyLayout(component, {
    direction: "row",
    gap: 4,
    padding: [0, 8],
    align: "center",
    justify: "center",
    fill: solid ? color : outline ? null : "accent/soft",
    stroke: outline ? "border/default" : null,
    radius: 999,
  });
  applySize(component, "hug", 20);

  const dot = frame("Dot", { direction: "none", fill: solid ? "accent/on-accent" : color, radius: 999 }, component);
  applySize(dot, 6, 6);

  const ink = solid ? "accent/on-accent" : variant === "Neutral" ? "text/primary" : color;
  (await text(component, "Active", "Label/Small", { color: ink })).name = "Label";
}

async function buildTagComponent(component: ComponentNode, color: string) {
  applyLayout(component, {
    direction: "row",
    gap: 4,
    padding: [0, 4, 0, 8],
    align: "center",
    fill: "accent/soft",
    radius: 999,
  });
  applySize(component, "hug", 20);
  (await text(component, "Berlin", "Label/Small", { color })).name = "Label";
  const remove = frame("Remove", { direction: "row", justify: "center", align: "center", radius: 999 }, component);
  applySize(remove, 16, 16);
  icon(remove, "x", "text/muted", 12);
}

/* ------------------------------------------------------------------ Avatar */

const AVATAR_SIZES: Record<string, number> = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };

async function buildAvatars(page: PageNode) {
  const section = await docSection(
    page,
    "Avatar",
    "component-lib/avatar · <Avatar name src size shape status> and <AvatarGroup max>. Without a picture the initials sit on a colour hashed from the name, so the same person is the same colour everywhere — in Figma, pick the swatch that matches. A group counts the overflow into one of its slots, so five people with max 4 show three faces and a +2.",
  );

  const variants: Variant[] = [];
  for (const kind of ["Initials", "Image", "Icon"]) {
    for (const size of Object.keys(AVATAR_SIZES)) {
      variants.push({
        props: { Content: kind, Size: size },
        build: (component) => buildAvatarComponent(component, kind, size, "circle"),
      });
    }
  }
  for (const kind of ["Initials", "Image"]) {
    variants.push({
      props: { Content: kind, Size: "md-square" },
      build: (component) => buildAvatarComponent(component, kind, "md", "square"),
    });
  }

  const set = await variantSet(section, "Avatar", "A person. Code: <Avatar name src>.", variants, 5);
  textProperty(set, "Initials", "Initials", "AL");
  booleanProperty(set, "Status dot", "Status", false);

  const row = await exampleRow(section, "Example — a group of five with four slots");
  const group = frame("AvatarGroup", { direction: "row", gap: -8 }, row);
  for (let index = 0; index < 3; index++) {
    instance(group, set, { Content: "Initials", Size: "md" });
  }
  const overflow = frame("Overflow", {
    direction: "row",
    justify: "center",
    align: "center",
    fill: "surface/subtle",
    radius: 999,
  }, group);
  applySize(overflow, 32, 32);
  await text(overflow, "+2", "Label/Small", { color: "text/primary" });
}

async function buildAvatarComponent(
  component: ComponentNode,
  kind: string,
  size: string,
  shape: string,
) {
  const px = AVATAR_SIZES[size];
  applyLayout(component, {
    direction: "row",
    justify: "center",
    align: "center",
    fill: kind === "Image" ? "surface/subtle" : "accent/soft",
    radius: shape === "square" ? "radius/md" : 999,
  });
  applySize(component, px, px);

  if (kind === "Icon") {
    icon(component, "users", "text/muted", px * 0.55).name = "Glyph";
  } else if (kind === "Image") {
    // A placeholder rectangle: designers swap in a real fill.
    const image = frame("Image", { direction: "row", justify: "center", align: "center" }, component);
    applySize(image, px, px);
    setFill(image, "surface/subtle");
    icon(image, "image", "text/muted", px * 0.5);
  } else {
    const style = px <= 24 ? "Label/Small" : px >= 56 ? "Title/Section" : "Label/Strong";
    (await text(component, "AL", style, { color: "accent/strong" })).name = "Initials";
  }

  const status = frame("Status", { direction: "none", fill: "status/success", radius: 999, stroke: "surface/bg", strokeWeight: 2 }, component);
  status.layoutPositioning = "ABSOLUTE";
  const dot = Math.max(8, Math.round(px * 0.3));
  status.resize(dot, dot);
  status.x = px - dot;
  status.y = px - dot;
  status.constraints = { horizontal: "MAX", vertical: "MAX" };
}

/* ---------------------------------------------------------------- Progress */

async function buildProgress(page: PageNode) {
  const section = await docSection(
    page,
    "Progress",
    "component-lib/progress · <Progress value max label showValue variant size> and <CircularProgress>. For work with a known end; a Spinner is the right thing when there is nothing to measure. A value of null means the length is unknown, which is not the same as zero: the bar sweeps and aria-valuenow is left off, which is what makes a screen reader say “busy”.",
  );

  const variants: Variant[] = [];
  for (const variant of ["Accent", "Success", "Warning", "Danger"]) {
    for (const fill of ["25", "60", "100"]) {
      variants.push({
        props: { Variant: variant, Value: fill },
        build: (component) => buildProgressComponent(component, variant, Number(fill) / 100, "md"),
      });
    }
  }
  for (const size of ["sm", "lg"]) {
    variants.push({
      props: { Variant: "Accent", Value: `60-${size}` },
      build: (component) => buildProgressComponent(component, "Accent", 0.6, size),
    });
  }

  const set = await variantSet(section, "Progress", "A bar for work with a known end. Code: <Progress value>.", variants, 3);
  textProperty(set, "Label", "Label", "Uploading report.pdf");
  textProperty(set, "Value", "Value", "62%");
  booleanProperty(set, "Show header", "Header", true);

  const row = await exampleRow(section, "Example — the ring, at three sizes");
  for (const [diameter, thickness] of [[28, 3], [44, 4], [56, 6]]) {
    const ring = frame(`Ring ${diameter}`, { direction: "row", justify: "center", align: "center" }, row);
    applySize(ring, diameter, diameter);
    const track = figma.createEllipse();
    track.resize(diameter, diameter);
    setFill(track, null);
    setStroke(track, "surface/subtle", thickness);
    track.name = "Track";
    ring.appendChild(track);
    track.layoutPositioning = "ABSOLUTE";
    track.x = 0;
    track.y = 0;
    await text(ring, "62%", "Label/Small");
  }
}

async function buildProgressComponent(
  component: ComponentNode,
  variant: string,
  fraction: number,
  size: string,
) {
  const height = size === "sm" ? 4 : size === "lg" ? 12 : 8;
  const color =
    variant === "Success"
      ? "status/success"
      : variant === "Warning"
        ? "status/warning"
        : variant === "Danger"
          ? "status/danger"
          : "accent/default";

  applyLayout(component, { direction: "column", gap: 6 });
  applySize(component, 280, "hug");

  const header = frame("Header", { direction: "row", justify: "between", align: "center", gap: 12 }, component);
  applySize(header, "fill", "hug");
  (await text(header, "Uploading report.pdf", "Label/Default")).name = "Label";
  (await text(header, `${Math.round(fraction * 100)}%`, "Body/Small", { color: "text/muted" })).name = "Value";

  const track = frame("Track", { direction: "row", fill: "surface/subtle", radius: 999, clip: true }, component);
  applySize(track, "fill", height);
  const bar = frame("Bar", { direction: "none", fill: color, radius: 999 }, track);
  applySize(bar, Math.max(2, Math.round(280 * fraction)), height);
}

/* --------------------------------------------------------------- Accordion */

async function buildAccordions(page: PageNode) {
  const section = await docSection(
    page,
    "Accordion",
    "component-lib/accordion · <Accordion items multiple collapsible variant size iconPosition> with <AccordionItem title description meta>. Each section is a native <details>, so the header is focusable, Enter and Space work, and Ctrl+F finds text inside a closed panel. The chevron turns 180° when open.",
  );

  const variants: Variant[] = [];
  for (const state of ["Closed", "Open", "Hover", "Disabled"]) {
    variants.push({
      props: { State: state },
      build: (component) => buildAccordionItem(component, state),
    });
  }

  const set = await variantSet(section, "Accordion item", "One section. Code: <AccordionItem title>.", variants, 4);
  textProperty(set, "Title", "Title", "Shipping");
  textProperty(set, "Description", "Description", "Two to five working days");
  booleanProperty(set, "Show description", "Description", false);

  const row = await exampleRow(section, "Example — a group with one section open");
  const stack = frame("Accordion", { direction: "column", gap: 8 }, row);
  applySize(stack, 460, "hug");
  const open = instance(stack, set, { State: "Open" });
  applySize(open, "fill");
  setInstanceText(open, "Title", "Shipping");
  for (const title of ["Returns", "Support"]) {
    const item = instance(stack, set, { State: "Closed" });
    applySize(item, "fill");
    setInstanceText(item, "Title", title);
  }
}

async function buildAccordionItem(component: ComponentNode, state: string) {
  const open = state === "Open";
  applyLayout(component, {
    direction: "column",
    fill: "surface/bg",
    stroke: "border/default",
    radius: "radius/md",
    clip: true,
  });
  applySize(component, 460, "hug");

  const header = frame("Header", {
    direction: "row",
    gap: 10,
    padding: [12, 14],
    align: "center",
    fill: state === "Hover" ? "surface/hover" : null,
  }, component);
  applySize(header, "fill", "hug");

  const heading = frame("Heading", { direction: "column", gap: 1 }, header);
  applySize(heading, "fill", "hug");
  (await text(heading, "Shipping", "Label/Strong", {
    color: state === "Disabled" ? "text/muted" : "text/primary",
    width: "fill",
  })).name = "Title";
  (await text(heading, "Two to five working days", "Body/Small", { color: "text/muted", width: "fill" })).name = "Description";

  const chevron = icon(header, "chevronDown", "text/muted", 16);
  chevron.name = "Chevron";
  if (open) chevron.rotation = 180;

  if (open) {
    const body = frame("Body", { direction: "column", padding: [0, 14, 12, 14] }, component);
    applySize(body, "fill", "hug");
    await text(body, "Orders leave the warehouse the next working day.", "Body/Default", { width: "fill" });
  }
}
