import { describe, expect, it } from "vitest";
import { computeLayout, resolveColumns } from "../core/columns";
import { createInitialState } from "../core/state";
import type { ColumnDef } from "../core/types";
import { createFormatters } from "../core/values";
import { toCsv } from "../export/csv";
import { buildPrintHtml } from "../export/pdf";
import { buildExportTable } from "../export/table";
import { columnName, createXlsxBlob, escapeXml } from "../export/xlsx";
import { crc32 } from "../export/zip";

interface Person {
  id: number;
  name: string;
  age: number | null;
  joined: string;
  active: boolean;
  status: string;
}

const defs: ColumnDef<Person>[] = [
  { field: "id", type: "number" },
  { field: "name" },
  { field: "age", type: "number" },
  { field: "joined", type: "date" },
  { field: "active", type: "boolean" },
  { field: "status", options: [{ label: "Active", value: "active" }, { label: "New", value: "new" }] },
];

const people: Person[] = [
  { id: 1, name: '=HYPERLINK("x"), "quoted"', age: 34, joined: "2024-01-15", active: true, status: "active" },
  { id: 2, name: "bob", age: null, joined: "2023-06-01", active: false, status: "new" },
];

const columns = resolveColumns(defs);
const layout = computeLayout(columns, createInitialState({ data: people, columns: defs }));
const table = buildExportTable(people, layout.columns, createFormatters("en-US"));

describe("export", () => {
  it("escapes CSV fields and neutralizes formulas", () => {
    const [header, first, second] = toCsv(table).split("\r\n");
    expect(header).toBe("Id,Name,Age,Joined,Active,Status");
    expect(first).toBe(`1,"'=HYPERLINK(""x""), ""quoted""",34,"Jan 15, 2024",Yes,Active`);
    expect(second).toBe(`2,bob,,"Jun 1, 2023",No,New`);
  });

  it("writes a typed, escaped XLSX package", async () => {
    const bytes = new Uint8Array(await createXlsxBlob(table, "People & Co").arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("PK\x03\x04");

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("&quot;quoted&quot;");
    expect(text).toContain('<c r="C2"><v>34</v></c>');
    expect(text).toContain('<c r="E3" t="b"><v>0</v></c>');
    expect(text).toContain('<c r="D2" s="2">');
    expect(text).toContain('name="People &amp; Co"');
  });

  it("names columns, escapes XML and checksums like the spec", () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual(["A", "Z", "AA", "ZZ", "AAA"]);
    expect(escapeXml("a<b>&")).toBe("a&lt;b&gt;&amp;");
    expect(crc32([new TextEncoder().encode("hello")])).toBe(0x3610a686);
  });

  it("escapes HTML in the print view", () => {
    const html = buildPrintHtml(table, { title: "<Report>", orientation: "landscape", paperSize: "A4" });
    expect(html).toContain("&#60;Report&#62;");
    expect(html).not.toContain("<Report>");
  });
});
