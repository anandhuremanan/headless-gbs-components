import type { ExportTable } from "./table";

export interface PrintOptions {
  title: string;
  orientation: "portrait" | "landscape";
  paperSize: "A3" | "A4" | "A5" | "letter" | "legal";
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function buildPrintHtml(table: ExportTable, options: PrintOptions): string {
  const head = table.columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const numeric = table.columns.map((c) => c.type === "number");
  const body = table.text
    .map(
      (row) =>
        `<tr>${row
          .map((text, i) => `<td${numeric[i] ? ' class="num"' : ""}>${escapeHtml(text)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(options.title)}</title>
<style>
@page { size: ${options.paperSize} ${options.orientation}; margin: 12mm; }
body { font: 9pt/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; margin: 0; }
h1 { font-size: 13pt; margin: 0 0 8px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #c8c8c8; padding: 3px 6px; text-align: start; vertical-align: top; }
th { background: #f0f0f0; font-weight: 600; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
td.num { text-align: end; font-variant-numeric: tabular-nums; }
</style></head><body><h1>${escapeHtml(options.title)}</h1>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

/**
 * Opens the browser's print dialog with the table laid out for paper, where
 * the user picks "Save as PDF". No PDF library is bundled.
 */
export function printTable(table: ExportTable, options: PrintOptions): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";

  const cleanup = () => iframe.remove();
  iframe.addEventListener("load", () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    // Fallback for browsers that never fire afterprint.
    setTimeout(cleanup, 60_000);
  }, { once: true });

  iframe.srcdoc = buildPrintHtml(table, options);
  document.body.append(iframe);
}
