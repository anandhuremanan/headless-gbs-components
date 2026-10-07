import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildToolInputSchema,
  registerAgentTool,
  webmcpAvailable,
  type ModelContext,
  type ProjectableAgent,
  type ProjectedOutcome,
} from "../core/agent/webmcp";

/*
 * The WebMCP projection, on its own.
 *
 * Tested against a hand-written agent rather than a real component, because
 * the question here is only whether the projection relays what the validator
 * said and refuses to act on its own. Whether a *grid* validates correctly is
 * the grid's own test; this file would still pass if the grid were deleted.
 *
 * The one thing deliberately not substituted is the shape of the contract:
 * `validate` and `execute` return the same five statuses a real agent returns.
 */

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

function fakeContext() {
  const registered: Tool[] = [];
  const context = {
    registerTool: (tool: Tool) => {
      if (registered.some((entry) => entry.name === tool.name)) {
        throw new Error(`Duplicate tool name: ${tool.name}`);
      }
      registered.push(tool);
    },
  } as unknown as ModelContext;
  return { context, registered };
}

const SCHEMA = {
  oneOf: [
    { type: "object" as const, properties: { action: { const: "filter" } } },
    { type: "object" as const, properties: { action: { const: "sort" } } },
  ],
};

/** A stand-in agent whose answers the test dictates. */
function fakeAgent(outcome: ProjectedOutcome, executed: unknown[] = []) {
  const agent: ProjectableAgent = {
    schema: () => SCHEMA,
    validate: () => outcome,
    execute: async (intent) => {
      executed.push(intent);
      return outcome;
    },
  };
  return agent;
}

const DONE: ProjectedOutcome = {
  status: "done",
  commands: [{ intent: { action: "filter" }, explain: { summary: "Filter Region is Kerala" } }],
  warnings: [{ layer: "coercion", code: "scale-applied", message: 'Read "1 crore" as 10000000.' }],
};

const register = (agent: ProjectableAgent, context: ModelContext, extra = {}) =>
  registerAgentTool(agent, {
    name: "operate_thing",
    describe: () => "Operate the thing.",
    modelContext: context,
    ...extra,
  });

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
  vi.restoreAllMocks();
});

/* --------------------------------------------------------- availability */

describe("availability", () => {
  it("reports unavailable without a document, rather than throwing", () => {
    // Server rendering has no `document`; touching it would be a crash, and a
    // component library is imported during SSR whether or not it is used.
    expect(typeof document).toBe("undefined");
    expect(webmcpAvailable()).toBe(false);
  });

  it("does not register, and says why, when the browser has no WebMCP", () => {
    (globalThis as { document?: unknown }).document = {};
    const result = registerAgentTool(fakeAgent(DONE), {
      name: "operate_thing",
      describe: () => "Operate the thing.",
    });

    expect(result.registered).toBe(false);
    expect(result.reason).toMatch(/document\.modelContext is unavailable/);
    expect(result.reason).toMatch(/WebMCPTesting/);
  });

  it("registers against an injected context with no document at all", () => {
    const { context, registered } = fakeContext();
    expect(register(fakeAgent(DONE), context).registered).toBe(true);
    expect(registered).toHaveLength(1);
  });
});

/* ------------------------------------------------------------- the schema */

describe("the advertised schema", () => {
  it("wraps the agent's own generated schema, unaltered", () => {
    const agent = fakeAgent(DONE);
    const schema = buildToolInputSchema(agent);

    expect(schema.properties?.intents.items).toBe(agent.schema());
    expect(schema.required).toEqual(["intents"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties?.intents.minItems).toBe(1);
  });

  it("caps batch size, and lets a host lower it", () => {
    expect(buildToolInputSchema(fakeAgent(DONE)).properties?.intents.maxItems).toBe(8);
    expect(
      buildToolInputSchema(fakeAgent(DONE), { maxIntents: 2 }).properties?.intents.maxItems,
    ).toBe(2);
  });
});

/* -------------------------------------------------------- a valid call */

describe("a valid call", () => {
  it("executes, and reports what the validator explained", async () => {
    const executed: unknown[] = [];
    const { context, registered } = fakeContext();
    register(fakeAgent(DONE, executed), context, {
      summarise: () => ({ rowsShowing: 18, rowsTotal: 40 }),
    });

    const response = await registered[0].execute({ intents: [{ action: "filter" }] });

    expect(response.isError).toBe(false);
    expect(response.structuredContent).toMatchObject({
      ok: true,
      status: "done",
      message: "Filter Region is Kerala",
      rowsShowing: 18,
      rowsTotal: 40,
    });
    expect(response.structuredContent.warnings).toEqual([
      'scale-applied: Read "1 crore" as 10000000.',
    ]);
    // The whole batch reached execute, exactly once.
    expect(executed).toEqual([[{ action: "filter" }]]);
  });

  it("puts the human-readable summary in the MCP text content too", async () => {
    const { context, registered } = fakeContext();
    register(fakeAgent(DONE), context);
    const response = await registered[0].execute({ intents: [{ action: "filter" }] });
    expect(response.content).toEqual([{ type: "text", text: "Filter Region is Kerala" }]);
  });
});

/* ------------------------------------------- what the validator refuses */

describe("refusals are relayed, not reinterpreted", () => {
  const nothingRan = (executed: unknown[]) => expect(executed).toEqual([]);

  it("relays a rejection with its code and layer", async () => {
    const executed: unknown[] = [];
    const { context, registered } = fakeContext();
    register(
      fakeAgent(
        {
          status: "rejected",
          reason: 'There is no column "state".',
          code: "unknown-column",
          layer: "reference",
          suggestion: 'Did you mean "region"?',
        },
        executed,
      ),
      context,
    );

    const response = await registered[0].execute({ intents: [{ action: "filter" }] });

    expect(response.isError).toBe(true);
    expect(response.structuredContent).toMatchObject({
      ok: false,
      status: "rejected",
      code: "unknown-column",
      layer: "reference",
      suggestion: 'Did you mean "region"?',
      message: 'There is no column "state".',
    });
    nothingRan(executed);
  });

  it("relays a clarification as a question, not as a failure to parse", async () => {
    const executed: unknown[] = [];
    const { context, registered } = fakeContext();
    register(
      fakeAgent({ status: "clarify", question: "Top by revenue or by signups?" }, executed),
      context,
    );

    const response = await registered[0].execute({ intents: [{ action: "sort" }] });
    expect(response.structuredContent).toMatchObject({
      ok: false,
      status: "clarify",
      message: "Top by revenue or by signups?",
    });
    nothingRan(executed);
  });

  it("relays a refusal to act", async () => {
    const executed: unknown[] = [];
    const { context, registered } = fakeContext();
    register(fakeAgent({ status: "declined", reason: "This grid cannot group." }, executed), context);

    const response = await registered[0].execute({ intents: [{ action: "sort" }] });
    expect(response.structuredContent).toMatchObject({
      ok: false,
      status: "declined",
      message: "This grid cannot group.",
    });
    nothingRan(executed);
  });

  it("will not let an agent skip a confirmation a person would see", async () => {
    const executed: unknown[] = [];
    const { context, registered } = fakeContext();
    register(
      fakeAgent(
        {
          status: "needs-confirmation",
          commands: [{ intent: { action: "export" }, explain: { summary: "Export 40 rows as CSV" } }],
          warnings: [],
          confirm: { code: "leaves-the-page", message: "This downloads a file. Continue?" },
        },
        executed,
      ),
      context,
    );

    const response = await registered[0].execute({ intents: [{ action: "export" }] });

    expect(response.structuredContent).toMatchObject({
      ok: false,
      status: "needs-confirmation",
      code: "leaves-the-page",
      message: "This downloads a file. Continue?",
    });
    expect(response.structuredContent.explain).toEqual(["Export 40 rows as CSV"]);
    nothingRan(executed);
  });

  it("refuses a malformed payload before the validator is reached", async () => {
    const executed: unknown[] = [];
    const { context, registered } = fakeContext();
    const agent = fakeAgent(DONE, executed);
    const validate = vi.spyOn(agent, "validate");
    register(agent, context);

    for (const bad of [{}, { intents: [] }, { intents: "filter" }, null, undefined]) {
      const response = await registered[0].execute(bad);
      expect(response.structuredContent).toMatchObject({
        ok: false,
        code: "missing-intents",
      });
    }
    expect(validate).not.toHaveBeenCalled();
    nothingRan(executed);
  });
});

/* -------------------------------------------------------------- failures */

describe("failures stay inside the tool call", () => {
  it("turns a throwing validator into a refusal, not an unhandled rejection", async () => {
    const { context, registered } = fakeContext();
    const agent = fakeAgent(DONE);
    agent.validate = () => {
      throw new Error("contract went stale");
    };
    register(agent, context);

    const response = await registered[0].execute({ intents: [{ action: "filter" }] });
    expect(response.structuredContent).toMatchObject({
      ok: false,
      code: "validator-threw",
      message: "contract went stale",
    });
  });

  it("turns a throwing executor into a reported failure", async () => {
    const { context, registered } = fakeContext();
    const agent = fakeAgent(DONE);
    agent.execute = async () => {
      throw new Error("the api handle was detached");
    };
    register(agent, context);

    const response = await registered[0].execute({ intents: [{ action: "filter" }] });
    expect(response.structuredContent).toMatchObject({
      ok: false,
      code: "executor-threw",
      message: "the api handle was detached",
    });
  });

  it("does not let a broken onCall observer fail a good command", async () => {
    const { context, registered } = fakeContext();
    register(fakeAgent(DONE), context, {
      onCall: () => {
        throw new Error("the UI log blew up");
      },
    });

    const response = await registered[0].execute({ intents: [{ action: "filter" }] });
    expect(response.structuredContent.ok).toBe(true);
  });
});

/* ------------------------------------------------- the adapter owns nothing */

describe("the adapter owns no semantics", () => {
  it("registers one tool regardless of how many operations exist", () => {
    const { context, registered } = fakeContext();
    register(fakeAgent(DONE), context);
    expect(registered).toHaveLength(1);
  });

  it("surfaces a duplicate registration rather than swallowing it", () => {
    const { context } = fakeContext();
    register(fakeAgent(DONE), context);
    // One tool per page is the contract; a second is a caller mistake.
    expect(() => register(fakeAgent(DONE), context)).toThrow(/Duplicate tool name/);
  });

  it("observes every call, successful or not", async () => {
    const seen: { ok: boolean; status: string }[] = [];
    const { context, registered } = fakeContext();
    register(fakeAgent(DONE), context, {
      onCall: (entry) => seen.push({ ok: entry.result.ok, status: entry.result.status }),
    });

    await registered[0].execute({ intents: [{ action: "filter" }] });
    await registered[0].execute({});

    expect(seen).toEqual([
      { ok: true, status: "done" },
      { ok: false, status: "rejected" },
    ]);
  });
});
