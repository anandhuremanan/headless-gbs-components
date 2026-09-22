// Form fields: Input, OtpInput, Textarea, Select and MultiSelect, DatePicker.

/** Label above, control, hint or error below — the layout every field shares. */
async function fieldShell(component: ComponentNode, width: number, state: string, label = "Label"): Promise<FrameNode> {
  applyLayout(component, { direction: "column", gap: 4 });
  applySize(component, width, "hug");
  (await text(component, label, "Label/Default")).name = "Label";
  const control = frame("Control", {
    direction: "row",
    gap: 6,
    padding: [0, 10],
    align: "center",
    fill: state === "Read-only" ? "surface/readonly" : "surface/input",
    stroke: state === "Invalid" ? "status/danger" : state === "Hover" ? "text/muted" : "border/default",
    radius: "radius/md",
  }, component);
  if (state === "Focus") control.effects = [focusRing()];
  if (state === "Invalid") control.effects = [];
  return control;
}

async function fieldFooter(component: ComponentNode, state: string, hint = "Hint text") {
  if (state === "Invalid") {
    (await text(component, "Error message", "Body/Small", { color: "status/danger", width: "fill" })).name = "Error";
  } else {
    (await text(component, hint, "Body/Small", { color: "text/muted", width: "fill" })).name = "Hint";
  }
  if (state === "Disabled") component.opacity = 0.55;
}

const FIELD_STATES = ["Default", "Hover", "Focus", "Filled", "Invalid", "Disabled", "Read-only"];

async function buildForms(page: PageNode) {
  await buildInputs(page);
  await buildOtp(page);
  await buildTextareas(page);
  await buildSelects(page);
  await buildDatePickers(page);
}

/* ------------------------------------------------------------------- Input */

async function buildInputs(page: PageNode) {
  const section = await docSection(
    page,
    "Input",
    "component-lib/input · <Input label description error leading trailing clearable showCount size type>. Filled shows a value; Focus shows the 2 px focus ring; Invalid swaps the hint for the error. Toggle leading/trailing adornments, the clear button and the counter with properties. type=\"password\" adds a show/hide button (Password variant).",
  );

  const variants: Variant[] = [];
  for (const kind of ["Text", "Password"]) {
    for (const state of FIELD_STATES) {
      variants.push({ props: { Type: kind, State: state, Size: "md" }, build: (component) => buildInputComponent(component, kind, state, "md") });
    }
  }
  for (const size of ["sm", "lg"] as SizeName[]) {
    variants.push({ props: { Type: "Text", State: "Default", Size: size }, build: (component) => buildInputComponent(component, "Text", "Default", size) });
  }
  const set = await variantSet(section, "Input", "Text field. Code: <Input>.", variants, 7);
  textProperty(set, "Label", "Label", "Email");
  textProperty(set, "Value", "Value", "ada@example.com");
  textProperty(set, "Hint", "Hint", "We'll send the receipt here.");
  booleanProperty(set, "Leading", "Leading", false);
  booleanProperty(set, "Trailing", "Trailing", false);
  booleanProperty(set, "Clear button", "Clear", false);
  booleanProperty(set, "Counter", "Count", false);
}

async function buildInputComponent(component: ComponentNode, kind: string, state: string, size: SizeName) {
  const control = await fieldShell(component, 280, state, kind === "Password" ? "Password" : "Email");
  controlShape(control, size, "fill");
  const filled = state !== "Default" && state !== "Hover" && state !== "Focus";
  (await text(control, "@", CONTROL_SIZES[size].body, { color: "text/muted" })).name = "Leading";
  const value = await text(control, kind === "Password" ? (filled ? "••••••••••" : "Enter password") : filled ? "ada@example.com" : "name@company.com", CONTROL_SIZES[size].body, {
    color: filled ? "text/primary" : "text/muted",
    width: "fill",
  });
  value.name = "Value";
  if (state === "Focus") {
    const caret = frame("Caret", { direction: "none", fill: "text/primary" }, control);
    applySize(caret, 1, 16);
  }
  icon(control, "x", "text/muted", 14).name = "Clear";
  if (kind === "Password") icon(control, "eye", "text/muted", 16).name = "Reveal";
  (await text(control, "kg", CONTROL_SIZES[size].body, { color: "text/muted" })).name = "Trailing";

  const footer = frame("Footer", { direction: "row", gap: 8, justify: "between" }, component);
  applySize(footer, "fill", "hug");
  if (state === "Invalid") {
    (await text(footer, "Enter a valid email address", "Body/Small", { color: "status/danger", width: "fill" })).name = "Error";
  } else {
    (await text(footer, "We'll send the receipt here.", "Body/Small", { color: "text/muted", width: "fill" })).name = "Hint";
  }
  (await text(footer, "15 / 40", "Body/Small", { color: "text/muted" })).name = "Count";
  if (state === "Disabled") component.opacity = 0.55;
}

/* --------------------------------------------------------------------- OTP */

async function buildOtp(page: PageNode) {
  const section = await docSection(
    page,
    "OtpInput",
    "component-lib/input · <OtpInput length mode groups mask onComplete>. In code it is one real input drawn as cells, so SMS autofill and paste work. Compose a code from Cell instances; Active shows the caret, Filled shows a character.",
  );

  const variants: Variant[] = [];
  for (const state of ["Empty", "Active", "Filled", "Filled active", "Invalid", "Disabled"]) {
    for (const size of ["sm", "md", "lg"] as SizeName[]) {
      variants.push({
        props: { State: state, Size: size },
        build: async (component) => {
          const cell = { sm: 34, md: 42, lg: 50 }[size];
          const active = state.includes("Active") || state === "Filled active";
          applyLayout(component, {
            direction: "row",
            justify: "center",
            align: "center",
            fill: "surface/input",
            stroke: state === "Invalid" ? "status/danger" : state.startsWith("Filled") ? "text/muted" : "border/default",
            radius: "radius/md",
          });
          applySize(component, cell, Math.round(cell * 1.15));
          if (active) component.effects = [focusRing()];
          if (state.startsWith("Filled") || state === "Invalid") {
            (await text(component, "4", "Numeric/OTP")).name = "Character";
          } else if (state === "Active") {
            const caret = frame("Caret", { direction: "none", fill: "text/primary" }, component);
            applySize(caret, 1.5, 20);
          }
          if (state === "Disabled") component.opacity = 0.55;
        },
      });
    }
  }
  const set = await variantSet(section, "OTP cell", "One character of a code. Code: <OtpInput>.", variants, 3);
  textProperty(set, "Character", "Character", "4");

  const row = await exampleRow(section, "Example — 6 digits, groups={[3, 3]}");
  const field = frame("OtpInput", { direction: "column", gap: 4 }, row);
  await text(field, "Verification code", "Label/Default");
  const cells = frame("Cells", { direction: "row", gap: 8, align: "center" }, field);
  ["1", "2", "3", "", "", ""].forEach((digit, index) => {
    if (index === 3) {
      const dash = frame("Separator", { direction: "none", fill: "text/muted", radius: 1 }, cells);
      applySize(dash, 10, 2);
    }
    const node = instance(cells, set, { State: digit ? "Filled" : index === 3 ? "Active" : "Empty", Size: "md" });
    if (digit) setInstanceText(node, "Character", digit);
  });
  await text(field, "Type or paste the code from the SMS.", "Body/Small", { color: "text/muted" });
}

/* ---------------------------------------------------------------- Textarea */

async function buildTextareas(page: PageNode) {
  const section = await docSection(
    page,
    "Textarea",
    "component-lib/textarea · <Textarea autoResize minRows maxRows showCount resize>. The field grows with its text between minRows and maxRows; resize the component's height to show more lines.",
  );
  const variants: Variant[] = [];
  for (const state of FIELD_STATES) {
    variants.push({
      props: { State: state },
      build: async (component) => {
        applyLayout(component, { direction: "column", gap: 4 });
        applySize(component, 320, "hug");
        (await text(component, "Delivery notes", "Label/Default")).name = "Label";
        const box = frame("Field", {
          direction: "column",
          padding: [8, 10],
          fill: state === "Read-only" ? "surface/readonly" : "surface/input",
          stroke: state === "Invalid" ? "status/danger" : state === "Hover" ? "text/muted" : "border/default",
          radius: "radius/md",
        }, component);
        applySize(box, "fill", 96);
        if (state === "Focus") box.effects = [focusRing()];
        const filled = !["Default", "Hover", "Focus"].includes(state);
        (await text(box, filled ? "Leave the parcel with the neighbour at number 12 if nobody answers." : "Grows as you type, up to six lines", "Body/Default", {
          color: filled ? "text/primary" : "text/muted",
          width: "fill",
        })).name = "Value";
        const footer = frame("Footer", { direction: "row", gap: 8, justify: "between" }, component);
        applySize(footer, "fill", "hug");
        (await text(footer, state === "Invalid" ? "Write at least 20 characters." : "Shown to the courier.", "Body/Small", {
          color: state === "Invalid" ? "status/danger" : "text/muted",
          width: "fill",
        })).name = "Hint";
        (await text(footer, "68 / 280", "Body/Small", { color: "text/muted" })).name = "Count";
        if (state === "Disabled") component.opacity = 0.55;
      },
    });
  }
  const set = await variantSet(section, "Textarea", "Multi-line field. Code: <Textarea>.", variants, 4);
  textProperty(set, "Label", "Label", "Delivery notes");
  textProperty(set, "Value", "Value", "Leave the parcel with the neighbour.");
  booleanProperty(set, "Counter", "Count", true);
}

/* ------------------------------------------------------ Select / MultiSelect */

async function buildSelects(page: PageNode) {
  const section = await docSection(
    page,
    "Select & MultiSelect",
    "component-lib/combobox · <Select> and <MultiSelect maxVisibleTags>. The trigger, the popover list and its options are separate components so you can compose open states. Options can show a group heading, a description, a check mark (selected) and the active highlight (keyboard).",
  );

  const triggers: Variant[] = [];
  for (const kind of ["Single", "Multiple"]) {
    for (const state of ["Default", "Hover", "Open", "Filled", "Invalid", "Disabled"]) {
      triggers.push({
        props: { Type: kind, State: state },
        build: async (component) => {
          const control = await fieldShell(component, 300, state === "Open" ? "Focus" : state, kind === "Single" ? "Country" : "Departments");
          controlShape(control, "md", "fill");
          const filled = state === "Filled" || state === "Open" || state === "Invalid" || state === "Disabled";
          if (kind === "Multiple" && filled) {
            const tags = frame("Tags", { direction: "row", gap: 4 }, control);
            applySize(tags, "fill", "hug");
            for (const tag of ["Engineering", "Design"]) await tagChip(tags, tag);
            (await text(tags, "+2 more", "Body/Small", { color: "text/muted" })).name = "Overflow";
          } else {
            (await text(control, filled ? "Germany" : "Select…", "Body/Default", { color: filled ? "text/primary" : "text/muted", width: "fill" })).name = "Value";
          }
          if (filled) icon(control, "x", "text/muted", 14).name = "Clear";
          const chevron = icon(control, "chevronDown", "text/muted", 16);
          chevron.name = "Chevron";
          if (state === "Open") chevron.rotation = 180;
          await fieldFooter(component, state, "Grouped, with search");
        },
      });
    }
  }
  const triggerSet = await variantSet(section, "Select trigger", "Closed control. Code: <Select> / <MultiSelect>.", triggers, 6);
  textProperty(triggerSet, "Label", "Label", "Country");

  const options: Variant[] = [];
  for (const state of ["Default", "Active", "Selected", "Active selected", "Disabled"]) {
    options.push({
      props: { State: state },
      build: async (component) => {
        applyLayout(component, { direction: "row", gap: 8, padding: [6, 8], radius: "radius/sm", fill: state.startsWith("Active") ? "surface/hover" : null });
        applySize(component, 260, "hug");
        const check = icon(component, "check", "accent/default", 16);
        check.name = "Check";
        check.opacity = state.includes("elected") ? 1 : 0;
        const body = frame("Body", { direction: "column" }, component);
        applySize(body, "fill", "hug");
        (await text(body, "Germany", state.includes("elected") ? "Label/Default" : "Body/Default", {
          color: state.includes("elected") ? "accent/strong" : "text/primary",
        })).name = "Label";
        (await text(body, "Berlin", "Body/Small", { color: "text/muted" })).name = "Description";
        if (state === "Disabled") component.opacity = 0.45;
      },
    });
  }
  const optionSet = await variantSet(section, "Select option", "A list row. Toggle the description.", options, 5);
  textProperty(optionSet, "Label", "Label", "Germany");
  textProperty(optionSet, "Description", "Description", "Berlin");
  booleanProperty(optionSet, "Show description", "Description", false);

  const row = await exampleRow(section, "Example — open Select");
  const stack = frame("Open select", { direction: "column", gap: 4 }, row);
  instance(stack, triggerSet, { Type: "Single", State: "Open" });
  const popover = frame("Popover", { direction: "column", fill: "surface/bg", stroke: "border/default", radius: "radius/md", clip: true }, stack);
  popover.effects = [shadow(10, 30, -8, 0.18)];
  applySize(popover, 300, "hug");
  const search = frame("Search", { direction: "row", gap: 6, padding: [6, 10] }, popover);
  applySize(search, "fill", "hug");
  setStroke(search, "border/default");
  search.strokeTopWeight = 0;
  search.strokeLeftWeight = 0;
  search.strokeRightWeight = 0;
  icon(search, "search", "text/muted", 14);
  await text(search, "Search…", "Body/Default", { color: "text/muted" });
  const list = frame("List", { direction: "column", padding: 4 }, popover);
  applySize(list, "fill", "hug");
  await text(list, "EUROPE", "Label/Small", { color: "text/muted" });
  for (const [label, state] of [["France", "Default"], ["Germany", "Active selected"], ["Spain", "Default"]]) {
    const option = instance(list, optionSet, { State: state });
    setInstanceText(option, "Label", label);
    applySize(option, "fill");
  }
}

async function tagChip(parent: FrameNode, label: string) {
  const tag = frame("Tag", { direction: "row", gap: 2, padding: [2, 3, 2, 8], radius: "radius/full", fill: "accent/soft" }, parent);
  await text(tag, label, "Label/Small", { color: "accent/strong" });
  icon(tag, "x", "accent/strong", 12);
}

/* -------------------------------------------------------------- DatePicker */

async function buildDatePickers(page: PageNode) {
  const section = await docSection(
    page,
    "DatePicker & DateRangePicker",
    "component-lib/date-picker · <DatePicker> and <DateRangePicker presets numberOfMonths>. People can type the date or pick it. Build calendars from Day cells: Today has an accent outline, Selected is filled, In range shows the soft band with rounded Range start / Range end caps.",
  );

  const fields: Variant[] = [];
  for (const kind of ["Single", "Range"]) {
    for (const state of ["Default", "Focus", "Filled", "Invalid", "Disabled"]) {
      fields.push({
        props: { Type: kind, State: state },
        build: async (component) => {
          const control = await fieldShell(component, kind === "Range" ? 340 : 260, state, kind === "Range" ? "Reporting period" : "Delivery date");
          controlShape(control, "md", "fill");
          const filled = state !== "Default" && state !== "Focus";
          const color = filled ? "text/primary" : "text/muted";
          if (kind === "Range") {
            (await text(control, filled ? "1 Mar 2026" : "dd/mm/yyyy", "Body/Default", { color, width: "fill" })).name = "Start";
            await text(control, "–", "Body/Default", { color: "text/muted" });
            (await text(control, filled ? "31 Mar 2026" : "dd/mm/yyyy", "Body/Default", { color, width: "fill" })).name = "End";
          } else {
            (await text(control, filled ? "12 Mar 2026" : "dd/mm/yyyy", "Body/Default", { color, width: "fill" })).name = "Value";
          }
          if (filled) icon(control, "x", "text/muted", 14).name = "Clear";
          icon(control, "calendar", "text/muted", 16).name = "Calendar";
          await fieldFooter(component, state, kind === "Range" ? "Two months, with shortcuts" : "Type a date or pick one");
        },
      });
    }
  }
  await variantSet(section, "Date field", "Closed control. Code: <DatePicker> / <DateRangePicker>.", fields, 5);

  const days: Variant[] = [];
  for (const state of ["Default", "Hover", "Focus", "Today", "Selected", "Outside", "Disabled", "In range", "Range start", "Range end"]) {
    days.push({
      props: { State: state },
      build: async (component) => {
        const band = state.startsWith("Range") || state === "In range";
        applyLayout(component, { direction: "row", justify: "center", align: "center", fill: band ? "accent/soft" : null });
        applySize(component, 34, 36);
        if (state === "Range start") {
          component.topLeftRadius = 6;
          component.bottomLeftRadius = 6;
        }
        if (state === "Range end") {
          component.topRightRadius = 6;
          component.bottomRightRadius = 6;
        }
        const filled = state === "Selected" || state === "Range start" || state === "Range end";
        const day = frame("Day", {
          direction: "row",
          justify: "center",
          align: "center",
          radius: "radius/sm",
          fill: filled ? "accent/default" : state === "Hover" ? "surface/hover" : null,
          stroke: state === "Today" ? "accent/default" : null,
        }, component);
        applySize(day, 34, 34);
        if (state === "Focus") day.effects = [focusRing()];
        (await text(day, "12", filled || state === "Today" ? "Label/Strong" : "Body/Default", {
          color: filled ? "accent/on-accent" : state === "Outside" ? "text/muted" : "text/primary",
        })).name = "Number";
        if (state === "Disabled") day.opacity = 0.35;
      },
    });
  }
  const daySet = await variantSet(section, "Day cell", "One day in the calendar grid.", days, 5);
  textProperty(daySet, "Day", "Number", "12");

  // An open calendar for March 2026 (starts on a Sunday; Monday-first grid).
  const row = await exampleRow(section, "Example — calendar popover (range 9–13 March)");
  const panel = frame("Calendar", { direction: "column", gap: 4, padding: 8, fill: "surface/bg", stroke: "border/default", radius: "radius/md" }, row);
  panel.effects = [shadow(10, 30, -8, 0.18)];
  const nav = frame("Navigation", { direction: "row", justify: "between", align: "center" }, panel);
  applySize(nav, 238, "hug");
  icon(nav, "chevronLeft", "text/primary", 16);
  const title = frame("Title", { direction: "row", gap: 4, align: "center" }, nav);
  await text(title, "March 2026", "Label/Strong");
  icon(title, "chevronDown", "text/muted", 14);
  icon(nav, "chevronRight", "text/primary", 16);

  const weekdays = frame("Weekdays", { direction: "row" }, panel);
  for (const name of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
    const cell = frame(name, { direction: "row", justify: "center" }, weekdays);
    applySize(cell, 34, "hug");
    await text(cell, name, "Label/Small", { color: "text/muted" });
  }
  // 23 Feb … 5 Apr: six Monday-first weeks.
  const numbers = [23, 24, 25, 26, 27, 28, ...Array.from({ length: 31 }, (_, index) => index + 1), 1, 2, 3, 4, 5];
  for (let week = 0; week < 6; week++) {
    const line = frame(`Week ${week + 1}`, { direction: "row" }, panel);
    for (let column = 0; column < 7; column++) {
      const position = week * 7 + column;
      const value = numbers[position];
      const outside = position < 6 || position >= 37;
      const state = outside ? "Outside" : value === 9 ? "Range start" : value === 13 ? "Range end" : value > 9 && value < 13 ? "In range" : value === 16 ? "Today" : "Default";
      const cell = instance(line, daySet, { State: state });
      setInstanceText(cell, "Day", String(value));
    }
  }
  const footer = frame("Footer", { direction: "row", justify: "between", padding: [6, 0, 0, 0] }, panel);
  applySize(footer, 238, "hug");
  await text(footer, "Today", "Label/Default", { color: "accent/default" });
  await text(footer, "Clear", "Label/Default", { color: "accent/default" });
}
