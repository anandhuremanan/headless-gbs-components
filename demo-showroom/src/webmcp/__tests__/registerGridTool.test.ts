/*
 * The WebMCP projection, tested at the boundary that matters: does a tool call
 * reach the real validator, and does a refused call leave the grid alone?
 *
 * No WebMCP implementation is mocked beyond the one browser function the
 * adapter calls — `document.modelContext.registerTool`. Everything downstream
 * of it is production code: the generated schema, the five validation layers,
 * the executor registry, the snapshot history.
 *
 * The agent comes from the evaluation harness, so the grid under test is the
 * same fixture the frozen corpus is written against. "Show customers from
 * Kerala" is corpus case grid-001.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GRID_TOOL_NAME,
  registerGridTool,
  type GridAgent,
} from "@/components/data-grid";
// Generic to any component's agent, so it lives in the shared agent core.
import { buildToolInputSchema } from "@/components/shared";
/*
 * The browser-safe mount, not `tools/eval/harness` — the harness reads the
 * fixture with `node:fs`, and importing it here would pull Node types into
 * this app's browser tsconfig. Same fixture either way, so the grid under test
 * is still the one corpus case grid-001 was written against.
 */
import { mountInBrowser, type Fixture } from "../../../../tools/eval/browser-probe/mount";
import fixtureJson from "../../../../eval/grid/v0/fixture.json";

const fixture = fixtureJson as unknown as Fixture;
const mount = (override?: Partial<Fixture>) => ({
  agent: mountInBrowser({ ...fixture, ...override }),
});
const loadFixture = () => fixture;

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown): Promise<{
    isError: boolean;
    structuredContent: Record<string, unknown>;
    content: { type: string; text: string }[];
  }>;
};

/** The one browser API the adapter touches. Nothing else is substituted. */
function installFakeModelContext() {
  const registered: Tool[] = [];
  (globalThis as { document?: unknown }).document = {
    modelContext: {
      registerTool: (tool: Tool) => registered.push(tool),
      getTools: () => registered,
      executeTool: (name: string, input: unknown) => {
        const tool = registered.find((t) => t.name === name);
        if (!tool) throw new Error(`no such tool: ${name}`);
        return tool.execute(input);
      },
    },
  };
  return registered;
}

const KERALA = { action: "filter", column: "region", operator: "equals", value: "Kerala" };

let agent: GridAgent<unknown>;
let tools: Tool[];

beforeEach(() => {
  tools = installFakeModelContext();
  agent = mount().agent as GridAgent<unknown>;
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

/* ------------------------------------------------------------ registration */

describe("registration and schema", () => {
  it("registers exactly one tool, named operate_grid", () => {
    const result = registerGridTool(agent);
    expect(result).toMatchObject({ registered: true, toolName: "operate_grid" });
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe(GRID_TOOL_NAME);
  });

  it("derives the input schema from the live contract, not from a copy", () => {
    registerGridTool(agent);
    const schema = tools[0].inputSchema as {
      properties: { intents: { items: { oneOf: { properties: Record<string, { const?: string; enum?: unknown[] }> }[] } } };
    };

    // The item schema is the generated per-instance GridIntent schema.
    expect(schema.properties.intents.items).toEqual(agent.schema());

    const branches = schema.properties.intents.items.oneOf;
    const filterColumns = branches
      .filter((b) => b.properties.action?.const === "filter")
      .map((b) => b.properties.column?.const);

    // This grid's columns, with this grid's rules: email is policy-restricted
    // and therefore has no filter branch at all.
    expect(filterColumns).toContain("region");
    expect(filterColumns).not.toContain("email");
  });

  it("describes itself with this grid's columns and operations", () => {
    registerGridTool(agent);
    expect(tools[0].description).toContain("region");
    expect(tools[0].description).toContain("filter");
  });

  it("says why it could not register when the browser has no WebMCP", () => {
    (globalThis as { document?: unknown }).document = {};
    const result = registerGridTool(agent);
    expect(result.registered).toBe(false);
    expect(result.reason).toMatch(/document\.modelContext is unavailable/);
    expect(result.reason).toMatch(/WebMCPTesting/);
  });
});

/* ---------------------------------------------------------- a valid call */

describe("a valid call reaches the existing executor", () => {
  it("filters the grid and reports what it did", async () => {
    registerGridTool(agent);
    expect(agent.contract().stats.filteredRows).toBe(40);

    const response = await tools[0].execute({ intents: [KERALA] });

    expect(response.isError).toBe(false);
    expect(response.structuredContent).toMatchObject({
      ok: true,
      status: "done",
      rowsShowing: 18,
      rowsTotal: 40,
      canUndo: true,
    });
    expect(response.structuredContent.message).toBe("Filter Region is Kerala");

    // The grid really changed, through the real executor.
    expect(agent.contract().state.filters).toEqual([
      { column: "region", operator: "equals", value: "Kerala" },
    ]);
  });

  it("accepts a value written the way a person writes it", async () => {
    registerGridTool(agent);
    const response = await tools[0].execute({
      intents: [{ action: "filter", column: "revenue", operator: "gt", value: "1 crore" }],
    });

    expect(response.structuredContent.ok).toBe(true);
    // Coercion happened in the validator, not here.
    expect(response.structuredContent.applied).toEqual([
      { action: "filter", column: "revenue", operator: "gt", value: 10000000 },
    ]);
    expect(response.structuredContent.warnings).toContain(
      'scale-applied: Read "1 crore" as 10000000.',
    );
  });

  it("applies a batch as one undoable step", async () => {
    registerGridTool(agent);
    await tools[0].execute({
      intents: [KERALA, { action: "sort", column: "revenue", direction: "desc" }],
    });
    expect(agent.contract().state.sorting).toEqual([{ column: "revenue", direction: "desc" }]);
    expect(agent.history()).toHaveLength(1);
  });
});

/* ------------------------------------------------------- invalid calls */

describe("invalid calls are refused by the existing validator", () => {
  const unchanged = () => ({
    filters: agent.contract().state.filters,
    sorting: agent.contract().state.sorting,
    rows: agent.contract().stats.filteredRows,
    history: agent.history().length,
  });

  it("refuses an unknown column, and suggests the real one", async () => {
    registerGridTool(agent);
    const before = unchanged();

    const response = await tools[0].execute({
      intents: [{ action: "filter", column: "state", operator: "equals", value: "Kerala" }],
    });

    expect(response.isError).toBe(true);
    expect(response.structuredContent).toMatchObject({
      ok: false,
      status: "rejected",
      code: "unknown-column",
      layer: "reference",
    });
    expect(response.structuredContent.suggestion).toContain("region");
    expect(unchanged()).toEqual(before);
  });

  it("refuses an operator the column's type does not have", async () => {
    registerGridTool(agent);
    const before = unchanged();

    const response = await tools[0].execute({
      intents: [{ action: "filter", column: "revenue", operator: "startsWith", value: "1" }],
    });

    expect(response.structuredContent).toMatchObject({ ok: false, layer: "schema" });
    expect(unchanged()).toEqual(before);
  });

  it("refuses a column the host restricted, with the policy reason", async () => {
    registerGridTool(agent);
    const before = unchanged();

    const response = await tools[0].execute({
      intents: [{ action: "filter", column: "email", operator: "contains", value: "@" }],
    });

    expect(response.structuredContent).toMatchObject({
      ok: false,
      code: "not-filterable",
      layer: "policy",
    });
    expect(unchanged()).toEqual(before);
  });

  it("refuses a malformed payload without reaching the validator", async () => {
    registerGridTool(agent);
    const before = unchanged();

    for (const bad of [{}, { intents: [] }, { intents: "filter" }, null]) {
      const response = await tools[0].execute(bad);
      expect(response.structuredContent).toMatchObject({ ok: false, code: "missing-intents" });
    }
    expect(unchanged()).toEqual(before);
  });

  it("will not let an agent skip a confirmation a person would see", async () => {
    registerGridTool(agent);
    const before = unchanged();

    // Export is irreversible, so the validator demands confirmation.
    const response = await tools[0].execute({ intents: [{ action: "export", format: "csv" }] });

    expect(response.structuredContent).toMatchObject({
      ok: false,
      status: "needs-confirmation",
    });
    expect(unchanged()).toEqual(before);
  });

  it("refuses an operation the grid does not have", async () => {
    registerGridTool(agent);
    const before = unchanged();

    const response = await tools[0].execute({
      intents: [{ action: "group", column: "region" }],
    });

    expect(response.structuredContent).toMatchObject({ ok: false, code: "unknown-operation" });
    expect(unchanged()).toEqual(before);
  });
});

/* --------------------------------------------------- the boundary holds */

describe("the adapter owns no semantics", () => {
  it("exposes one tool, not one per operation", () => {
    registerGridTool(agent);
    expect(tools).toHaveLength(1);
    expect(agent.contract().operations.length).toBeGreaterThan(20);
  });

  it("rebuilds its schema when the grid differs", () => {
    const narrow = mount({
      ...loadFixture(),
      columns: [
        { field: "id", type: "number" },
        { field: "name" },
      ],
    }).agent as GridAgent<unknown>;

    const wide = buildToolInputSchema(agent);
    const thin = buildToolInputSchema(narrow);
    expect(JSON.stringify(thin)).not.toBe(JSON.stringify(wide));
    expect(JSON.stringify(thin)).not.toContain("region");
  });
});
