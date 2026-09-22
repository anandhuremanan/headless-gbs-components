// Overlays, feedback and data: Modal, Dialog, Toast, FileUploader, DataGrid.

async function buildOverlays(page: PageNode) {
  await buildModal(page);
  await buildDialog(page);
  await buildToast(page);
  await buildUploader(page);
  await buildDataGrid(page);
}

/** A placeholder slot for the modal body, meant to be swapped for real content. */
async function slot(parent: FrameNode | ComponentNode, label: string, height: number) {
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

/* ------------------------------------------------------------------- Modal */

async function buildModal(page: PageNode) {
  const section = await docSection(
    page,
    "Modal",
    "component-lib/modal · <Modal title description footer size placement closeOnBackdrop onBeforeClose>. Sizes set the width (sm 400, md 520, lg 720, xl 960). Left/Right/Bottom placements are drawers. The body scrolls between a fixed header and footer. Replace the content slot with your layout; detach nothing — the header and footer are toggles.",
  );

  const variants: Variant[] = [];
  const widths: Record<string, number> = { sm: 400, md: 520, lg: 720 };
  for (const placement of ["Center", "Right", "Bottom"]) {
    const sizes = placement === "Center" ? ["sm", "md", "lg"] : ["md"];
    for (const size of sizes) {
      variants.push({
        props: { Placement: placement, Size: size },
        build: async (component) => {
          const drawer = placement !== "Center";
          applyLayout(component, {
            direction: "column",
            fill: "surface/bg",
            stroke: "border/default",
            radius: drawer ? 0 : "radius/lg",
            clip: true,
          });
          component.effects = [shadow(24, 64, -16, 0.3)];
          if (placement === "Right") applySize(component, widths[size], 560);
          else if (placement === "Bottom") applySize(component, 720, "hug");
          else applySize(component, widths[size], "hug");
          if (placement === "Bottom") {
            component.topLeftRadius = 12;
            component.topRightRadius = 12;
            component.bottomLeftRadius = 0;
            component.bottomRightRadius = 0;
          }

          const header = frame("Header", { direction: "row", gap: 12, padding: [16, 12, 12, 20], align: "start" }, component);
          applySize(header, "fill", "hug");
          const heading = frame("Heading", { direction: "column", gap: 4 }, header);
          applySize(heading, "fill", "hug");
          (await text(heading, "Edit profile", "Title/Dialog", { width: "fill" })).name = "Title";
          (await text(heading, "Changes are saved when you press Save.", "Body/Default", { color: "text/muted", width: "fill" })).name = "Description";
          const close = frame("Close", { direction: "row", justify: "center", align: "center", radius: "radius/sm" }, header);
          applySize(close, 30, 30);
          icon(close, "x", "text/muted", 16);

          const body = frame("Body", { direction: "column", gap: 12, padding: [0, 20, 20, 20] }, component);
          applySize(body, "fill", placement === "Right" ? "fill" : "hug");
          await slot(body, "Content", placement === "Right" ? 360 : 140);

          const footer = frame("Footer", { direction: "row", gap: 8, justify: "end", padding: [12, 20], fill: "surface/header" }, component);
          applySize(footer, "fill", "hug");
          setStroke(footer, "border/default");
          footer.strokeBottomWeight = 0;
          footer.strokeLeftWeight = 0;
          footer.strokeRightWeight = 0;
          await footerButton(footer, "Cancel", false);
          await footerButton(footer, "Save", true);
        },
      });
    }
  }
  const set = await variantSet(section, "Modal", "Dialog or drawer shell. Code: <Modal>.", variants, 3);
  textProperty(set, "Title", "Title", "Edit profile");
  textProperty(set, "Description", "Description", "Changes are saved when you press Save.");
  booleanProperty(set, "Show description", "Description", true);
  booleanProperty(set, "Show footer", "Footer", true);
  booleanProperty(set, "Close button", "Close", true);

  const row = await exampleRow(section, "Backdrop — place a modal over a frame filled with surface/backdrop");
  const backdrop = frame("Backdrop", { direction: "row", justify: "center", align: "center", fill: "surface/backdrop", radius: 8 }, row);
  applySize(backdrop, 720, 380);
  instance(backdrop, set, { Placement: "Center", Size: "sm" });
}

/** A plain button look for compositions (instances of Button work too). */
async function footerButton(parent: FrameNode, label: string, primary: boolean, danger = false) {
  const button = frame(label, {
    direction: "row",
    padding: [0, 14],
    justify: "center",
    align: "center",
    radius: "radius/md",
    fill: danger ? "status/danger" : primary ? "accent/default" : "surface/bg",
    stroke: primary || danger ? null : "border/default",
  }, parent);
  applySize(button, "hug", 34);
  await text(button, label, "Label/Default", { color: danger ? "status/on-danger" : primary ? "accent/on-accent" : "text/primary" });
  return button;
}

/* ------------------------------------------------------------------ Dialog */

async function buildDialog(page: PageNode) {
  const section = await docSection(
    page,
    "Dialog",
    "component-lib/dialog · await dialog.alert / confirm / prompt({ title, description, intent, confirmLabel }). Intent sets the icon and the confirm color; Danger focuses Cancel first in code. Pending shows the async onConfirm state; Error shows a failed onConfirm in place.",
  );

  const INTENT_ICON: Record<string, IconName | null> = { Default: null, Info: "info", Success: "success", Warning: "warning", Danger: "danger" };
  const INTENT_COLOR: Record<string, string> = { Default: "text/muted", Info: "status/info", Success: "status/success", Warning: "status/warning", Danger: "status/danger" };

  const variants: Variant[] = [];
  const add = (kind: string, intent: string, state: string) =>
    variants.push({
      props: { Kind: kind, Intent: intent, State: state },
      build: async (component) => {
        applyLayout(component, { direction: "column", fill: "surface/bg", stroke: "border/default", radius: "radius/lg", clip: true });
        component.effects = [shadow(24, 64, -16, 0.3)];
        applySize(component, 420, "hug");

        const body = frame("Body", { direction: "row", gap: 14, padding: [20, 20, 16, 20], align: "start" }, component);
        applySize(body, "fill", "hug");
        const glyph = INTENT_ICON[intent];
        if (glyph) {
          const badge = frame("Icon", { direction: "row", justify: "center", align: "center", radius: "radius/full" }, body);
          applySize(badge, 38, 38);
          badge.fills = [paintOf(INTENT_COLOR[intent])];
          badge.fills = [{ ...(badge.fills as SolidPaint[])[0], opacity: 0.14 }];
          icon(badge, glyph, INTENT_COLOR[intent], 20);
        }
        const copy = frame("Text", { direction: "column", gap: 6 }, body);
        applySize(copy, "fill", "hug");
        const titles: Record<string, string> = { alert: "Export finished", confirm: "Delete 3 invoices?", prompt: "Rename file" };
        (await text(copy, titles[kind.toLowerCase()], "Title/Dialog", { width: "fill" })).name = "Title";
        (await text(copy, kind === "Prompt" ? "Keep the .pdf extension." : "This can't be undone.", "Body/Default", { color: "text/muted", width: "fill" })).name = "Description";
        if (kind === "Prompt") {
          const input = frame("Input", { direction: "row", padding: [0, 10], align: "center", fill: "surface/input", stroke: state === "Error" ? "status/danger" : "border/default", radius: "radius/md" }, copy);
          applySize(input, "fill", 36);
          input.effects = [focusRing()];
          await text(input, "report.pdf", "Body/Default");
        }
        if (state === "Error") {
          (await text(copy, "The server didn't respond. Try again.", "Body/Small", { color: "status/danger", width: "fill" })).name = "Error";
        }

        const actions = frame("Actions", { direction: "row", gap: 8, justify: "end", padding: [12, 20], fill: "surface/header" }, component);
        applySize(actions, "fill", "hug");
        setStroke(actions, "border/default");
        actions.strokeBottomWeight = 0;
        actions.strokeLeftWeight = 0;
        actions.strokeRightWeight = 0;
        if (kind !== "Alert") await footerButton(actions, "Cancel", false);
        const confirm = await footerButton(actions, kind === "Alert" ? "OK" : intent === "Danger" ? "Delete" : "Confirm", true, intent === "Danger");
        confirm.name = "Confirm";
        if (state === "Pending") {
          confirm.opacity = 0.65;
          const spinner = icon(confirm, "spinnerArc", intent === "Danger" ? "status/on-danger" : "accent/on-accent", 14);
          confirm.insertChild(0, spinner);
        }
      },
    });

  for (const intent of Object.keys(INTENT_ICON)) add("Confirm", intent, "Default");
  add("Confirm", "Danger", "Pending");
  add("Confirm", "Danger", "Error");
  add("Alert", "Success", "Default");
  add("Alert", "Info", "Default");
  add("Prompt", "Default", "Default");
  add("Prompt", "Default", "Error");
  const set = await variantSet(section, "Dialog", "Alert, confirm or prompt. Code: dialog.confirm({ … }).", variants, 4);
  textProperty(set, "Title", "Title", "Delete 3 invoices?");
  textProperty(set, "Description", "Description", "This can't be undone.");
}

/* ------------------------------------------------------------------- Toast */

async function buildToast(page: PageNode) {
  const section = await docSection(
    page,
    "Toast",
    "component-lib/toaster · toast.success / error / warning / info / loading / promise. Stacks in a corner (default top-right), 356 px wide, 3 visible at once. The colored bar and icon follow the type; Action and Cancel buttons are toggles.",
  );

  const TYPE: Record<string, { bar: string | null; icon: IconName | null; iconColor: string; title: string }> = {
    Default: { bar: null, icon: null, iconColor: "text/muted", title: "Event created" },
    Success: { bar: "status/success", icon: "success", iconColor: "status/success", title: "Settings saved" },
    Error: { bar: "status/danger", icon: "danger", iconColor: "status/danger", title: "Upload failed" },
    Warning: { bar: "status/warning", icon: "warning", iconColor: "status/warning", title: "Storage almost full" },
    Info: { bar: "status/info", icon: "info", iconColor: "status/info", title: "A new version is available" },
    Loading: { bar: null, icon: "spinnerArc", iconColor: "text/muted", title: "Saving changes…" },
  };

  const variants: Variant[] = [];
  for (const [type, look] of Object.entries(TYPE)) {
    variants.push({
      props: { Type: type },
      build: async (component) => {
        applyLayout(component, { direction: "row", gap: 10, padding: [12, 10, 12, 14], align: "start", fill: "surface/bg", stroke: "border/default", radius: "radius/md", clip: true });
        component.effects = [shadow(10, 30, -8, 0.18)];
        applySize(component, 356, "hug");

        const bar = frame("Type bar", { direction: "none", fill: look.bar }, component);
        bar.layoutPositioning = "ABSOLUTE";
        bar.resize(3, 200);
        bar.x = 0;
        bar.y = 0;
        bar.constraints = { horizontal: "MIN", vertical: "STRETCH" };

        if (look.icon) icon(component, look.icon, look.iconColor, 18).name = "Icon";
        const content = frame("Content", { direction: "column", gap: 2 }, component);
        applySize(content, "fill", "hug");
        (await text(content, look.title, "Label/Strong", { width: "fill" })).name = "Title";
        (await text(content, "report.pdf could not be sent.", "Body/Default", { color: "text/muted", width: "fill" })).name = "Description";

        const actions = frame("Actions", { direction: "row", gap: 6, align: "center" }, component);
        const retry = frame("Action", { direction: "row", padding: [0, 10], align: "center", radius: "radius/sm", fill: "accent/default" }, actions);
        applySize(retry, "hug", 28);
        await text(retry, "Retry", "Label/Small", { color: "accent/on-accent" });
        icon(component, "x", "text/muted", 14).name = "Close";
      },
    });
  }
  const set = await variantSet(section, "Toast", "One notification. Code: toast.success(title, { description, action }).", variants, 3);
  textProperty(set, "Title", "Title", "Settings saved");
  textProperty(set, "Description", "Description", "report.pdf could not be sent.");
  booleanProperty(set, "Show description", "Description", true);
  booleanProperty(set, "Show action", "Actions", false);
  booleanProperty(set, "Close button", "Close", true);

  const row = await exampleRow(section, "Example — stack (top-right, newest first, 8 px apart)");
  const stack = frame("Toaster", { direction: "column", gap: 8 }, row);
  for (const type of ["Success", "Error", "Info"]) instance(stack, set, { Type: type });
}

/* ------------------------------------------------------------ FileUploader */

async function buildUploader(page: PageNode) {
  const section = await docSection(
    page,
    "FileUploader",
    "component-lib/file-uploader · <FileUploader multiple accept maxSize endpoint chunkSize preview existingFiles>. The drop zone, file rows and footer are separate components. File rows cover every upload status; the thumbnail color follows the file kind (image, video, audio, PDF, spreadsheet, document).",
  );

  const zones: Variant[] = [];
  for (const state of ["Default", "Hover", "Dragging", "Focus", "Invalid", "Disabled"]) {
    zones.push({
      props: { State: state },
      build: async (component) => {
        const dragging = state === "Dragging";
        applyLayout(component, {
          direction: "column",
          gap: 4,
          padding: [20, 16],
          align: "center",
          fill: dragging ? "accent/soft" : "surface/input",
          stroke: dragging ? "accent/default" : state === "Invalid" ? "status/danger" : state === "Hover" ? "text/muted" : "border/control",
          strokeWeight: 1.5,
          radius: "radius/md",
        });
        component.dashPattern = [6, 4];
        applySize(component, 460, "hug");
        icon(component, "upload", dragging ? "accent/default" : "text/muted", 28);
        const line = frame("Call to action", { direction: "row", gap: 4 }, component);
        if (dragging) {
          await text(line, "Drop to add files", "Body/Default");
        } else {
          await text(line, "Drag files here or", "Body/Default");
          const browse = await text(line, "browse", "Label/Default", { color: "accent/default" });
          browse.textDecoration = "UNDERLINE";
        }
        (await text(component, "PDF, image/* · Up to 20 MB each · 5 files max", "Body/Small", { color: "text/muted" })).name = "Hint";
        if (state === "Focus") component.effects = [focusRing()];
        if (state === "Disabled") component.opacity = 0.55;
      },
    });
  }
  const zoneSet = await variantSet(section, "Upload drop zone", "Code: <FileUploader> drop zone.", zones, 3);
  textProperty(zoneSet, "Hint", "Hint", "PDF, image/* · Up to 20 MB each");

  const STATUS: Record<string, { meta: string; color: string; progress: number | null; actions: IconName[] }> = {
    Idle: { meta: "2.4 MB", color: "text/muted", progress: null, actions: ["x"] },
    Queued: { meta: "2.4 MB · Waiting", color: "text/muted", progress: null, actions: ["x"] },
    Uploading: { meta: "1.1 MB of 2.4 MB · 46%", color: "text/muted", progress: 0.46, actions: ["pause", "x"] },
    Paused: { meta: "2.4 MB · Paused · 46%", color: "text/muted", progress: 0.46, actions: ["retry", "x"] },
    Success: { meta: "2.4 MB · Uploaded", color: "status/success", progress: null, actions: ["x"] },
    Error: { meta: "2.4 MB · Failed", color: "status/danger", progress: 0.3, actions: ["retry", "x"] },
    Existing: { meta: "248 KB · Uploaded", color: "text/muted", progress: null, actions: ["download", "x"] },
  };
  const rows: Variant[] = [];
  for (const [status, look] of Object.entries(STATUS)) {
    for (const kind of status === "Uploading" ? ["pdf", "image", "spreadsheet", "video", "audio", "document"] : ["pdf"]) {
      rows.push({
        props: { Status: status, Kind: capitalize(kind) },
        build: async (component) => {
          applyLayout(component, {
            direction: "row",
            gap: 10,
            padding: [8, 8, 8, 10],
            align: "center",
            fill: "surface/bg",
            stroke: status === "Error" ? "status/danger" : "border/default",
            radius: "radius/md",
          });
          applySize(component, 460, "hug");
          const thumb = frame("Thumbnail", { direction: "row", justify: "center", align: "center", radius: "radius/sm" }, component);
          applySize(thumb, 40, 40);
          thumb.fills = [{ ...paintOf(`file/${kind}`), opacity: 0.12 }];
          icon(thumb, kind === "image" ? "image" : "file", `file/${kind}`, 20);

          const body = frame("Body", { direction: "column", gap: 1 }, component);
          applySize(body, "fill", "hug");
          const names: Record<string, string> = { pdf: "contract-signed.pdf", image: "site-photo.jpg", spreadsheet: "q3-revenue.xlsx", video: "walkthrough.mp4", audio: "interview.m4a", document: "notes.docx" };
          (await text(body, names[kind], "Label/Default", { width: "fill", truncate: true })).name = "File name";
          (await text(body, look.meta, "Body/Small", { color: look.color, width: "fill" })).name = "Meta";
          if (status === "Error") (await text(body, "Upload failed with status 503", "Body/Small", { color: "status/danger" })).name = "Error";
          if (look.progress !== null) {
            const track = frame("Progress", { direction: "row", fill: "surface/hover", radius: "radius/full", clip: true }, body);
            applySize(track, "fill", 4);
            const bar = frame("Bar", { direction: "none", fill: status === "Error" ? "status/danger" : status === "Paused" ? "text/muted" : "accent/default" }, track);
            applySize(bar, Math.round(360 * look.progress), 4);
          }
          const actions = frame("Actions", { direction: "row", gap: 2, align: "center" }, component);
          for (const action of look.actions) {
            const button = frame(action, { direction: "row", justify: "center", align: "center", radius: "radius/sm" }, actions);
            applySize(button, 28, 28);
            icon(button, action, "text/muted", 14);
          }
        },
      });
    }
  }
  const rowSet = await variantSet(section, "Upload file row", "One file with its status. Code: a row in <FileUploader>.", rows, 3);
  textProperty(rowSet, "File name", "File name", "contract-signed.pdf");
  textProperty(rowSet, "Meta", "Meta", "2.4 MB · Uploaded");

  const example = await exampleRow(section, "Example — uploader with files");
  const uploader = frame("FileUploader", { direction: "column", gap: 8 }, example);
  await text(uploader, "Attachments", "Label/Default");
  instance(uploader, zoneSet, { State: "Default" });
  for (const status of ["Success", "Uploading", "Error"]) {
    instance(uploader, rowSet, { Status: status, Kind: "Pdf" });
  }
  const footer = frame("Footer", { direction: "row", gap: 8, justify: "end" }, uploader);
  applySize(footer, 460, "hug");
  await footerButton(footer, "Clear", false);
  await footerButton(footer, "Upload 2 files", true);
}

/* ---------------------------------------------------------------- DataGrid */

async function buildDataGrid(page: PageNode) {
  const section = await docSection(
    page,
    "DataGrid",
    "component-lib/data-grid · <DataGrid data columns enableRowSelection pagination toolbar>. Compose tables from Header cell, Cell and the checkbox column; rows are 36 px (standard density). Sorted headers show the direction; Selected and Hover rows tint every cell in the row; Editing shows an inline field; Pinned cells cast a shadow on the scrolling side.",
  );

  const headers: Variant[] = [];
  for (const sort of ["None", "Ascending", "Descending"]) {
    for (const align of ["Start", "End"]) {
      headers.push({
        props: { Sort: sort, Align: align },
        build: async (component) => {
          applyLayout(component, { direction: "row", gap: 6, padding: [0, 12], align: "center", justify: align === "End" ? "end" : "start", fill: "surface/header" });
          applySize(component, 160, 36);
          setStroke(component, "border/default");
          component.strokeTopWeight = 0;
          component.strokeLeftWeight = 0;
          component.strokeRightWeight = 0;
          (await text(component, align === "End" ? "Salary" : "Name", "Label/Strong", { color: "text/header" })).name = "Label";
          if (sort !== "None") icon(component, sort === "Ascending" ? "chevronDown" : "chevronDown", "accent/default", 14).rotation = sort === "Ascending" ? 180 : 0;
          icon(component, "more", "text/muted", 14).name = "Menu";
        },
      });
    }
  }
  const headerSet = await variantSet(section, "Grid header cell", "Column header. Code: column header.", headers, 6);
  textProperty(headerSet, "Label", "Label", "Name");

  const cells: Variant[] = [];
  for (const row of ["Default", "Striped", "Hover", "Selected"]) {
    for (const state of ["Default", "Focus", "Editing"]) {
      if (state !== "Default" && row !== "Default") continue;
      cells.push({
        props: { Row: row, State: state },
        build: async (component) => {
          const fill: Record<string, string | null> = { Default: "surface/bg", Striped: "surface/row-alt", Hover: "surface/hover", Selected: "surface/row-selected" };
          applyLayout(component, { direction: "row", padding: [0, 12], align: "center", fill: fill[row] });
          applySize(component, 160, 36);
          setStroke(component, "border/subtle");
          component.strokeTopWeight = 0;
          component.strokeLeftWeight = 0;
          component.strokeRightWeight = 0;
          if (state === "Editing") {
            component.paddingLeft = 4;
            component.paddingRight = 4;
            const input = frame("Editor", { direction: "row", padding: [0, 8], align: "center", fill: "surface/input", stroke: "accent/focus", strokeWeight: 2, radius: "radius/xs" }, component);
            applySize(input, "fill", 28);
            (await text(input, "Ada Lovelace", "Body/Default", { width: "fill" })).name = "Value";
          } else {
            (await text(component, "Ada Lovelace", "Body/Default", { width: "fill", truncate: true })).name = "Value";
          }
          if (state === "Focus") {
            component.strokes = [paintOf("accent/focus")];
            component.strokeWeight = 2;
            component.strokeAlign = "INSIDE";
          }
        },
      });
    }
  }
  const cellSet = await variantSet(section, "Grid cell", "Body cell. Code: a cell in <DataGrid>.", cells, 6);
  textProperty(cellSet, "Value", "Value", "Ada Lovelace");

  const selects: Variant[] = [];
  for (const checked of ["False", "True", "Indeterminate"]) {
    for (const where of ["Header", "Row"]) {
      selects.push({
        props: { Checked: checked, In: where },
        build: async (component) => {
          applyLayout(component, { direction: "row", justify: "center", align: "center", fill: where === "Header" ? "surface/header" : checked === "True" ? "surface/row-selected" : "surface/bg" });
          applySize(component, 44, 36);
          setStroke(component, where === "Header" ? "border/default" : "border/subtle");
          component.strokeTopWeight = 0;
          component.strokeLeftWeight = 0;
          component.strokeRightWeight = 0;
          const on = checked !== "False";
          const box = frame("Box", { direction: "row", justify: "center", align: "center", fill: on ? "accent/default" : "surface/input", stroke: on ? "accent/default" : "border/control", strokeWeight: 1.5, radius: "radius/xs" }, component);
          applySize(box, 16, 16);
          if (checked === "True") icon(box, "check", "accent/on-accent", 12);
          if (checked === "Indeterminate") icon(box, "minus", "accent/on-accent", 12);
        },
      });
    }
  }
  const selectSet = await variantSet(section, "Grid selection cell", "Checkbox column.", selects, 6);

  // A composed grid: toolbar, header, five rows, pagination.
  const example = await exampleRow(section, "Example — grid with toolbar, selection and pagination");
  const grid = frame("DataGrid", { direction: "column", fill: "surface/bg", stroke: "border/default", radius: "radius/md", clip: true }, example);

  const toolbar = frame("Toolbar", { direction: "row", gap: 8, padding: [8, 12], align: "center" }, grid);
  applySize(toolbar, 44 + 160 * 4, "hug");
  const search = frame("Search", { direction: "row", gap: 6, padding: [0, 10], align: "center", fill: "surface/input", stroke: "border/default", radius: "radius/md" }, toolbar);
  applySize(search, 240, 32);
  icon(search, "search", "text/muted", 14);
  await text(search, "Search…", "Body/Default", { color: "text/muted" });
  const spacer = frame("Spacer", { direction: "none" }, toolbar);
  applySize(spacer, "fill", 1);
  await footerButton(toolbar, "Columns", false);
  await footerButton(toolbar, "Export", false);

  const columns: [string, string][] = [["Name", "Start"], ["Department", "Start"], ["Start date", "Start"], ["Salary", "End"]];
  const header = frame("Header row", { direction: "row" }, grid);
  instance(header, selectSet, { Checked: "Indeterminate", In: "Header" });
  columns.forEach(([label, align], index) => {
    const cell = instance(header, headerSet, { Sort: index === 0 ? "Ascending" : "None", Align: align });
    setInstanceText(cell, "Label", label);
  });

  const data = [
    ["Aarav Patel", "Engineering", "12 Jan 2021", "$128,400"],
    ["Ada Lovelace", "Design", "3 Mar 2019", "$142,000"],
    ["Emma Garcia", "Finance", "22 Aug 2022", "$96,250"],
    ["Liam Nguyen", "Sales", "9 May 2020", "$88,900"],
    ["Sofia Rossi", "Support", "1 Feb 2023", "$71,300"],
  ];
  data.forEach((values, rowIndex) => {
    const selected = rowIndex === 1 || rowIndex === 3;
    const rowLook = selected ? "Selected" : rowIndex === 2 ? "Hover" : rowIndex % 2 === 1 ? "Striped" : "Default";
    const line = frame(`Row ${rowIndex + 1}`, { direction: "row" }, grid);
    instance(line, selectSet, { Checked: selected ? "True" : "False", In: "Row" });
    values.forEach((value) => {
      const cell = instance(line, cellSet, { Row: rowLook, State: "Default" });
      setInstanceText(cell, "Value", value);
    });
  });

  const pagination = frame("Pagination", { direction: "row", gap: 12, padding: [8, 12], align: "center", fill: "surface/header" }, grid);
  applySize(pagination, 44 + 160 * 4, "hug");
  await text(pagination, "2 selected", "Body/Default", { color: "text/muted" });
  const fill = frame("Spacer", { direction: "none" }, pagination);
  applySize(fill, "fill", 1);
  await text(pagination, "1–5 of 100,000", "Body/Default", { color: "text/muted" });
  for (const glyph of ["chevronLeft", "chevronRight"] as IconName[]) {
    const button = frame(glyph, { direction: "row", justify: "center", align: "center", radius: "radius/sm" }, pagination);
    applySize(button, 28, 28);
    icon(button, glyph, "text/primary", 16);
  }
}
