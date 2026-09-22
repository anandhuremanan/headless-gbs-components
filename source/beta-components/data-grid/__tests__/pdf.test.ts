import { describe, expect, it } from "vitest";
import { computeLayout, resolveColumns } from "../core/columns";
import { createInitialState } from "../core/state";
import type { ColumnDef } from "../core/types";
import { createFormatters } from "../core/values";
import { encode, fit, literal, widthOf } from "../export/pdf-font";
import { buildPdf, pdfDate, textString } from "../export/pdf-writer";
import { createPdfBlob, defaultPdfTheme, renderPages } from "../export/pdf";
import { buildExportTable } from "../export/table";

interface Row {
  id: number;
  name: string;
  salary: number;
}

const defs: ColumnDef<Row>[] = [
  { field: "id", type: "number", width: 80 },
  { field: "name", width: 220 },
  { field: "salary", type: "number", width: 120 },
];

function tableOf(count: number) {
  const rows = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Person (${index + 1})`,
    salary: 1000 * (index + 1),
  }));

  const columns = resolveColumns(defs);
  const layout = computeLayout(columns, createInitialState({ data: rows, columns: defs }));
  return buildExportTable(rows, layout.columns, createFormatters("en-US"));
}

const options = {
  title: "Report",
  orientation: "landscape",
  paperSize: "A4",
  margin: 36,
  fontSize: 9,
  header: { left: "{title}" },
  footer: { right: "Page {page} of {pages}" },
  theme: defaultPdfTheme,
} as const;

/** Reads the file back the way it was written: one character, one byte. */
async function latin1(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
}

describe("pdf fonts", () => {
  it("encodes WinAnsi, replacing what the encoding cannot carry", () => {
    // Latin-1 passes through; the 0x80-0x9F specials are remapped.
    expect(encode("Müller")).toEqual([77, 0xfc, 108, 108, 101, 114]);
    expect(encode("“quoted” — €5")).toEqual([0x93, 113, 117, 111, 116, 101, 100, 0x94, 32, 0x97, 32, 0x80, 53]);

    // Malayalam and emoji have no WinAnsi code, so they read as "?".
    expect(encode("ത")).toEqual([0x3f]);
    expect(encode("a\tb")).toEqual([97, 32, 98]);
  });

  it("measures with the real Helvetica advance widths", () => {
    // "A" is 667/1000 em, "i" is 222/1000, at 10pt.
    expect(widthOf(encode("A"), "regular", 10)).toBeCloseTo(6.67, 5);
    expect(widthOf(encode("i"), "regular", 10)).toBeCloseTo(2.22, 5);
    // Bold "A" is wider at 722/1000.
    expect(widthOf(encode("A"), "bold", 10)).toBeCloseTo(7.22, 5);
  });

  it("truncates to an ellipsis and never overruns the cell", () => {
    const long = encode("Engineering Department");
    const clipped = fit(long, "regular", 9, 40);

    expect(clipped.length).toBeLessThan(long.length);
    expect(clipped[clipped.length - 1]).toBe(0x85);
    expect(widthOf(clipped, "regular", 9)).toBeLessThanOrEqual(40);

    // Text that already fits is returned untouched.
    expect(fit(encode("ok"), "regular", 9, 400)).toEqual(encode("ok"));
    // Not even the ellipsis fits.
    expect(fit(long, "regular", 9, 1)).toEqual([]);
  });

  it("escapes only the three string delimiters", () => {
    expect(literal(encode("a(b)c\\d"))).toBe("a\\(b\\)c\\\\d");
    expect(literal(encode("plain"))).toBe("plain");
  });
});

describe("pdf writer", () => {
  it("writes a header, an xref whose offsets are right, and a trailer", async () => {
    const blob = buildPdf(["<</Type/Catalog/Pages 2 0 R>>", { stream: "hello" }], {
      root: 1,
      info: 1,
    });
    const text = await latin1(blob);

    expect(text.startsWith("%PDF-1.7\n")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("<</Length 5>>\nstream\nhello\nendstream");

    // Every xref offset must land exactly on its object header.
    const start = Number(text.slice(text.lastIndexOf("startxref") + 10).split("\n")[0]);
    expect(text.startsWith("xref\n", start)).toBe(true);

    // Skip "xref" and the "0 N" subsection line to reach the 20-byte entries.
    const first = text.indexOf("\n", text.indexOf("\n", start) + 1) + 1;

    for (let id = 1; id <= 2; id++) {
      const at = Number(text.slice(first + id * 20, first + id * 20 + 10));
      expect(text.startsWith(`${id} 0 obj`, at)).toBe(true);
    }
  });

  it("writes document info as UTF-16BE, which /Title needs", () => {
    // A bare literal would be read as PDFDocEncoding, where 0x97 is S-caron
    // rather than the em dash the caller passed.
    expect(textString("A—B")).toBe("<FEFF004120140042>");
    expect(textString("Hi")).toBe("<FEFF00480069>");
  });

  it("formats dates the way /CreationDate wants them", () => {
    expect(pdfDate(new Date(Date.UTC(2026, 8, 22, 9, 5, 3)))).toBe("D:20260922090503+00'00'");
  });
});

describe("pdf layout", () => {
  it("repeats the header row on every page and fills page tokens", () => {
    const pages = renderPages(tableOf(120), options);

    expect(pages.length).toBeGreaterThan(1);

    for (const page of pages) {
      expect(page).toContain("(Name) Tj");
      expect(page).toContain("/F2 9 Tf");
    }

    expect(pages[0]).toContain(`(Page 1 of ${pages.length}) Tj`);
    expect(pages[1]).toContain(`(Page 2 of ${pages.length}) Tj`);
    expect(pages[0]).toContain("(Report) Tj");
  });

  it("puts every row on exactly one page, in order", () => {
    const table = tableOf(120);
    const pages = renderPages(table, options);
    const drawn = pages.flatMap((page) => [...page.matchAll(/\(Person \\\((\d+)\\\)\) Tj/g)].map((m) => Number(m[1])));

    expect(drawn).toEqual(table.text.map((_, index) => index + 1));
  });

  it("right-aligns numbers and left-aligns text", () => {
    const [page] = renderPages(tableOf(1), options);
    const at = (label: string) => {
      const match = page.match(new RegExp(`([\\d.]+) [\\d.]+ Td \\(${label}\\) Tj`));
      return Number(match![1]);
    };

    // Compare each cell against its own column header, which is always drawn
    // from the left edge. A numeric cell is pushed right; a text cell is not.
    expect(at("1")).toBeGreaterThan(at("Id"));
    expect(at("1000")).toBeGreaterThan(at("Salary"));
    expect(at("Person \\\\\\(1\\\\\\)")).toBeCloseTo(at("Name"), 5);
  });

  it("honours paper size and orientation", async () => {
    const table = tableOf(3);
    const portrait = await latin1(await createPdfBlob(table, { ...options, orientation: "portrait" }));
    const landscape = await latin1(await createPdfBlob(table, { ...options, orientation: "landscape" }));
    const a5 = await latin1(await createPdfBlob(table, { ...options, paperSize: "A5" }));

    expect(portrait).toContain("/MediaBox[0 0 595.28 841.89]");
    expect(landscape).toContain("/MediaBox[0 0 841.89 595.28]");
    expect(a5).toContain("/MediaBox[0 0 595.28 419.53]");
  });

  it("drops the bands when they are null, and the stripe when it is null", () => {
    const bare = renderPages(tableOf(2), {
      ...options,
      header: null,
      footer: null,
      theme: { ...defaultPdfTheme, stripe: null },
    });

    expect(bare[0]).not.toContain("(Report) Tj");
    expect(bare[0]).not.toContain("Page 1 of");
    // One `re f` remains: the header row's fill.
    expect(bare[0].match(/re f/g)).toHaveLength(1);
  });

  it("produces a single valid file for the whole table", async () => {
    const blob = await createPdfBlob(tableOf(60), options);
    const text = await latin1(blob);

    expect(blob.type).toBe("application/pdf");
    expect(text.startsWith("%PDF-1.7")).toBe(true);
    expect(text).toContain("/BaseFont/Helvetica/Encoding/WinAnsiEncoding");
    expect(text).toContain("/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding");
    expect(text).toContain(`/Title ${textString("Report")}`);

    const count = Number(text.match(/\/Type\/Pages\/Count (\d+)/)![1]);
    expect(text.match(/\/Type\/Page\//g)).toHaveLength(count);

    // Node has CompressionStream, so the streams should be Flate encoded.
    expect(text).toContain("/Filter/FlateDecode");
  });
});
