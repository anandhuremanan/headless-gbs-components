/*
 * WebMCP projection: one tool that exposes an already-validated command
 * boundary to whatever agent is driving the browser.
 *
 * This is an adapter and nothing else. It owns no schema, no semantics and no
 * execution path. The chain stays:
 *
 *   component source → passport → runtime contract → GridIntent schema
 *     → [this file] → existing validator → existing executors → grid
 *
 * `document.modelContext` is the Chrome 150+ surface; `navigator.modelContext`
 * is deprecated. Feature detection checks the document.
 *
 * One tool, not twenty-one. The twenty-one operations are not the agent's
 * interface — `GridIntent` is, because that is where the generated schema and
 * the five validation layers already meet. Exposing each operation separately
 * would mean twenty-one schemas to keep in step with a contract that already
 * describes itself.
 */

import type { GridAgent } from "@/components/data-grid";

/** The slice of the WebMCP surface this proof uses. */
interface ModelContext {
  registerTool(descriptor: {
    name: string;
    description: string;
    inputSchema: unknown;
    execute(input: unknown): Promise<unknown>;
  }): void | Promise<void>;
  getTools?(): unknown;
  executeTool?(name: string, input: unknown): Promise<unknown>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export const TOOL_NAME = "operate_grid";

export interface RegistrationResult {
  registered: boolean;
  toolName: string;
  /** Why not, when `registered` is false. */
  reason?: string;
  /** The schema handed to the agent, for inspection in a test or the UI. */
  inputSchema?: unknown;
}

/**
 * The tool's input schema, derived from the live contract.
 *
 * Not hand-written. `agent.schema()` is the generated per-instance GridIntent
 * schema — this grid's column ids, this grid's operator sets, this grid's
 * export formats — so a tool registered against a grid with different columns
 * advertises different arguments, automatically.
 */
export function buildToolInputSchema(agent: GridAgent<unknown>): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["intents"],
    properties: {
      intents: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        description:
          "Operations to apply in order. Several filters on different columns combine with AND.",
        items: agent.schema(),
      },
    },
  };
}

function describe(agent: GridAgent<unknown>): string {
  const contract = agent.contract();
  const columns = contract.columns
    .filter((column) => column.filterable || column.sortable)
    .map((column) => column.id)
    .join(", ");

  return [
    "Filter, sort, search, paginate, select rows in, or export the data grid on this page.",
    `Columns: ${columns}.`,
    `Operations: ${contract.operations.join(", ")}.`,
    "Values may be written as a person would — \"1 lakh\", \"20%\", \"last month\" — and are",
    "converted exactly. Every call is validated before anything happens; an invalid request",
    "is refused with a reason rather than approximated.",
  ].join(" ");
}

/**
 * Registers the tool, if the browser has WebMCP.
 *
 * `execute` runs the production pipeline and nothing else:
 *
 *   validate  → a refusal is returned as the validator wrote it
 *   confirm   → anything irreversible stops here and asks, rather than running
 *   execute   → only after validation passed
 *
 * There is no repair, no retry, and no path that exists only for WebMCP. If an
 * agent sends something the grid cannot do, it gets the same refusal a form
 * would have got.
 */
export function registerGridTool(
  agent: GridAgent<unknown>,
  hooks: { onCall?: (entry: unknown) => void } = {},
): RegistrationResult {
  const modelContext = document.modelContext;

  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return {
      registered: false,
      toolName: TOOL_NAME,
      reason:
        "document.modelContext is unavailable. Chrome needs --enable-features=WebMCPTesting, " +
        "the chrome://flags/#enable-webmcp-testing flag, or an origin-trial token.",
    };
  }

  const inputSchema = buildToolInputSchema(agent);

  modelContext.registerTool({
    name: TOOL_NAME,
    description: describe(agent),
    inputSchema,

    async execute(rawInput: unknown) {
      const input = (rawInput ?? {}) as { intents?: unknown };
      const intents = input.intents;

      const reply = (payload: Record<string, unknown>) => {
        hooks.onCall?.({ input: rawInput, result: payload });
        return {
          // MCP's content shape, so an agent reading text gets something useful…
          content: [{ type: "text", text: String(payload.message ?? payload.status) }],
          // …and the structured result for anything that wants to inspect it.
          structuredContent: payload,
          isError: payload.ok === false,
        };
      };

      if (!Array.isArray(intents) || intents.length === 0) {
        return reply({
          ok: false,
          status: "rejected",
          code: "missing-intents",
          message: '"intents" must be a non-empty array of grid operations.',
        });
      }

      /* Layer one of the real pipeline. Nothing has touched the grid yet. */
      const checked = agent.validate(intents);

      if (checked.status === "rejected") {
        return reply({
          ok: false,
          status: "rejected",
          code: checked.code,
          layer: checked.layer,
          suggestion: checked.suggestion,
          message: checked.reason,
        });
      }

      if (checked.status === "clarify") {
        return reply({ ok: false, status: "clarify", message: checked.question });
      }

      if (checked.status === "declined") {
        return reply({ ok: false, status: "declined", message: checked.reason });
      }

      if (checked.status === "needs-confirmation") {
        /*
         * An agent does not get to skip a confirmation a person would see. The
         * grid is left untouched and the request is handed back.
         */
        return reply({
          ok: false,
          status: "needs-confirmation",
          code: checked.confirm.code,
          message: checked.confirm.message,
          explain: checked.commands.map((command) => command.explain.summary),
        });
      }

      const run = await agent.execute(intents);

      if (run.status !== "done") {
        return reply({
          ok: false,
          status: run.status,
          message: "reason" in run ? run.reason : run.status,
        });
      }

      const contract = agent.contract();
      return reply({
        ok: true,
        status: "done",
        message: run.commands.map((command) => command.explain.summary).join("; "),
        applied: run.commands.map((command) => command.intent),
        rowsShowing: contract.stats.filteredRows,
        rowsTotal: contract.stats.totalRows,
        warnings: run.warnings.map((warning) => `${warning.code}: ${warning.message}`),
        canUndo: contract.state.canUndo,
      });
    },
  });

  return { registered: true, toolName: TOOL_NAME, inputSchema };
}
