import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  createGridAgent,
  DataGrid,
  GRID_TOOL_NAME,
  registerGridTool,
  type GridAgent,
  type GridApi,
  type ModelContext,
  type RegistrationResult,
  type ToolCallLog,
} from "@/components/data-grid";
import { createEmployees, DEPARTMENTS, type Employee } from "./data";
import { GramproAIProvider } from "@/components/shared";
import { askBackendAvailable, askViaAppBackend } from "./askAdapter";

/*
 * The agent boundary, shown working.
 *
 * One WebMCP tool — `operate_grid` — is registered from the live runtime
 * contract. An agent driving the browser calls it; the existing validator
 * decides whether anything happens; the existing executors do it. This panel
 * adds no second path: the buttons below send the same payloads an agent
 * would, through the same tool.
 *
 * Two dispatchers, because WebMCP is not shipping unflagged anywhere yet:
 *
 *   - `document.modelContext` when the browser has it, so a real agent and
 *     this panel go through Chrome's own dispatch.
 *   - an in-page registry otherwise, so the panel still demonstrates the
 *     boundary on a stock browser. It is the same tool descriptor and the same
 *     `execute`; only who called it differs, and the panel says which.
 */

const col = createColumnHelper<Employee>();

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const columns = [
  col.field("id", { header: "ID", type: "number", width: 80, align: "start" }),
  col.field("name", { header: "Name", width: 180 }),
  col.field("email", { header: "Email", width: 240 }),
  col.field("department", {
    header: "Department",
    width: 150,
    options: DEPARTMENTS.map((d) => ({ label: d, value: d })),
  }),
  col.field("country", { header: "Country", width: 140 }),
  col.field("salary", {
    header: "Salary",
    type: "number",
    width: 130,
    format: (value) => currency.format(value),
  }),
  col.field("rating", { header: "Rating", type: "number", width: 100 }),
  col.field("startDate", { header: "Start date", type: "date", width: 130 }),
  col.field("active", { header: "Active", type: "boolean", width: 100 }),
];

/*
 * What a machine cannot read off a column definition. This is the only
 * hand-written input to the contract, and it is what lets an agent know that
 * "top earners" means salary and that email is off limits.
 */
const SEMANTICS = {
  salary: {
    description: "Gross annual salary.",
    unit: "USD",
    synonyms: ["pay", "compensation", "earnings"],
    higherIsBetter: true,
  },
  rating: {
    description: "Performance rating, 1 to 5.",
    synonyms: ["score", "performance"],
    higherIsBetter: true,
  },
  startDate: { description: "The day they joined.", synonyms: ["joined", "hire date"] },
  department: { synonyms: ["team", "org"] },
  email: { pii: true },
} as const;

/*
 * Email stays readable on screen but is not something an agent may filter or
 * search on. `denyFilter` rather than `deny`, so the column is still visible —
 * the restriction is about what a machine may do with it, not about hiding it.
 */
const POLICY = {
  denyFilter: ["email"],
  confirmExportRows: 100,
} as const;

/* Shown as one-click chips, so a demo does not depend on anyone's typing. */
const SUGGESTIONS = [
  "Show people in Engineering",
  "Who earns over 150k?",
  "Engineering staff, highest paid first",
  "Only active people in Germany",
  "Clear the filters",
] as const;

const buttonClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";

interface Example {
  label: string;
  /** What a person would have said, for the audience's benefit. */
  utterance: string;
  intents: unknown[];
  /** Whether this one is meant to be refused. */
  refused?: boolean;
}

/*
 * The first four are ordinary requests. The last four are the point: each is
 * something an agent might plausibly send and must not get away with.
 */
const EXAMPLES: Example[] = [
  {
    /*
     * `department` carries `options`, so the contract gives it `in` rather
     * than `equals` — the operator set is derived from the column, not
     * assumed. Getting this wrong is refused at the schema layer, which is
     * how the mistake was found.
     */
    label: "Filter a list field",
    utterance: "Show people in Engineering",
    intents: [{ action: "filter", column: "department", operator: "in", value: ["Engineering"] }],
  },
  {
    label: "Filter free text",
    utterance: "Just the German office",
    intents: [{ action: "filter", column: "country", operator: "equals", value: "Germany" }],
  },
  {
    label: "Human-written number",
    utterance: "Who earns over 150k?",
    intents: [{ action: "filter", column: "salary", operator: "gt", value: "150k" }],
  },
  {
    label: "Two operations, one undo",
    utterance: "Top earners in Engineering",
    intents: [
      { action: "filter", column: "department", operator: "in", value: ["Engineering"] },
      { action: "sort", column: "salary", direction: "desc" },
    ],
  },
  {
    label: "Clear it",
    utterance: "Reset the view",
    intents: [{ action: "clearFilters" }],
  },
  {
    label: "Unknown field",
    utterance: "Filter by team name",
    intents: [{ action: "filter", column: "team", operator: "equals", value: "Engineering" }],
    refused: true,
  },
  {
    label: "Wrong operator for the type",
    utterance: "Salaries starting with 9",
    intents: [{ action: "filter", column: "salary", operator: "startsWith", value: "9" }],
    refused: true,
  },
  {
    label: "Field the host restricted",
    utterance: "Find everyone at example.com",
    intents: [{ action: "filter", column: "email", operator: "contains", value: "@example.com" }],
    refused: true,
  },
  {
    label: "Irreversible without asking",
    utterance: "Download this as a spreadsheet",
    intents: [{ action: "export", format: "csv" }],
    refused: true,
  },
];

/** A ModelContext that lives in this page, for browsers without WebMCP. */
function createLocalContext() {
  const tools: { name: string; execute(input: unknown): Promise<unknown> }[] = [];
  const context: ModelContext = {
    registerTool: (tool) => {
      tools.push(tool);
    },
    getTools: () => tools,
    executeTool: (tool, input) => {
      const name = typeof tool === "string" ? tool : (tool as { name: string }).name;
      const found = tools.find((entry) => entry.name === name);
      if (!found) throw new Error(`no such tool: ${name}`);
      return found.execute(input);
    },
  };
  return { context, tools };
}

type Dispatch = "webmcp" | "local";

interface Entry {
  at: string;
  utterance: string;
  intents: unknown[];
  result: Record<string, unknown>;
}

export function AgentDemo() {
  const apiRef = useRef<GridApi<Employee>>(null);
  /* Read inside onStateChange, which fires before `agent` state has settled. */
  const agentRef = useRef<GridAgent<Employee> | null>(null);
  const [data] = useState(() => createEmployees(500));
  const [agent, setAgent] = useState<GridAgent<Employee> | null>(null);
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [dispatch, setDispatch] = useState<Dispatch>("local");
  const [log, setLog] = useState<Entry[]>([]);
  const [stats, setStats] = useState<{ filteredRows: number | null; totalRows: number | null } | null>(
    null,
  );

  /*
   * Whether this app has a model key configured. Asked once, because offering
   * a box that cannot answer is worse than not offering one.
   */
  const [askReady, setAskReady] = useState(false);
  useEffect(() => {
    let live = true;
    void askBackendAvailable().then((ok) => {
      if (live) setAskReady(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  const options = useMemo(
    () => ({ data, columns, getRowId: "id" as const, enableRowSelection: true }),
    [data],
  );

  const local = useRef(createLocalContext());
  /*
   * StrictMode runs effects twice in development and WebMCP throws on a
   * duplicate tool name, so registration happens once per mount.
   */
  const registered = useRef(false);

  useEffect(() => {
    if (!apiRef.current || registered.current) return;
    registered.current = true;

    const built = createGridAgent<Employee>({
      api: apiRef.current,
      options,
      semantics: SEMANTICS,
      policy: POLICY,
      locale: "en-US",
    });
    agentRef.current = built;
    setAgent(built);
    setStats(built.contract().stats);

    const onCall = (entry: ToolCallLog) => {
      // Read the contract again after the command ran, so the counter on
      // screen reflects the grid rather than the previous render.
      setStats(built.contract().stats);
      return entry;
    };

    // Always available in-page, so the panel works on any browser.
    registerGridTool(built as GridAgent<unknown>, {
      modelContext: local.current.context,
      onCall,
    });

    // And to the real surface, for an actual agent, when the browser has one.
    const live = registerGridTool(built as GridAgent<unknown>, { onCall });
    setRegistration(live);
    setDispatch(live.registered ? "webmcp" : "local");
  }, [options]);

  const send = useCallback(
    async (example: Example) => {
      const payload = { intents: example.intents };

      /*
       * When the browser has WebMCP, go through its dispatch rather than
       * calling the tool directly — that is the part a direct call cannot
       * demonstrate. Chrome passes arguments and results as JSON strings.
       */
      let result: Record<string, unknown>;
      if (dispatch === "webmcp" && typeof document !== "undefined" && document.modelContext) {
        const context = document.modelContext;
        const tools = (await context.getTools?.()) as { name: string }[] | undefined;
        const tool = [...(tools ?? [])].find((entry) => entry.name === GRID_TOOL_NAME);
        const raw = await context.executeTool?.(tool, JSON.stringify(payload));
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        result = (parsed as { structuredContent?: Record<string, unknown> })?.structuredContent ?? {};
      } else {
        const raw = (await local.current.context.executeTool?.(
          { name: GRID_TOOL_NAME },
          payload,
        )) as { structuredContent?: Record<string, unknown> };
        result = raw?.structuredContent ?? {};
      }

      setLog((previous) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            utterance: example.utterance,
            intents: example.intents,
            result,
          },
          ...previous,
        ].slice(0, 6),
      );
    },
    [dispatch],
  );

  const contract = agent?.contract();
  const branches = useMemo(() => {
    const schema = agent?.schema() as { oneOf?: unknown[] } | undefined;
    return schema?.oneOf?.length ?? 0;
  }, [agent]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono font-semibold">{GRID_TOOL_NAME}</span>
          <span
            className={
              registration?.registered
                ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                : "rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100"
            }
          >
            {registration === null
              ? "registering…"
              : registration.registered
                ? "registered with the browser"
                : "no WebMCP in this browser"}
          </span>
          {contract && (
            <span className="text-zinc-600 dark:text-zinc-400">
              contract {contract.contractVersion} · {contract.columns.length} columns ·{" "}
              {contract.operations.length} operations · {branches} intent branches · showing{" "}
              <span className="font-mono" data-testid="agent-rows-showing">
                {stats?.filteredRows ?? contract.stats.filteredRows}
              </span>{" "}
              of {stats?.totalRows ?? contract.stats.totalRows}
            </span>
          )}
        </div>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {registration?.registered
            ? "An agent driving this page can discover and call the tool. The buttons below go through the browser's own dispatch."
            : "The tool is still built from the live contract and still runs through the validator — it is dispatched in-page instead. Run Chrome with --enable-features=WebMCPTesting to see a real agent dispatch it."}
        </p>
        {registration && !registration.registered && (
          <p className="mt-1 font-mono text-xs text-zinc-500">{registration.reason}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            className={
              example.refused
                ? `${buttonClass} border-dashed text-amber-700 dark:text-amber-300`
                : buttonClass
            }
            title={example.utterance}
            onClick={() => void send(example)}
            disabled={!agent}
          >
            {example.label}
          </button>
        ))}
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            agent?.undo();
            if (agent) setStats(agent.contract().stats);
          }}
          disabled={!agent}
        >
          Undo
        </button>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Solid buttons are ordinary requests. Dashed ones are requests an agent must not get away
        with — each is refused by the validator, with a reason, and the grid does not move.
      </p>

      <GramproAIProvider
        adapter={askReady ? askViaAppBackend : null}
        placeholder="Ask about these employees…"
        suggestions={SUGGESTIONS}
      >
        <DataGrid
          ref={apiRef}
          data={data}
          columns={columns}
          getRowId="id"
          enableRowSelection
          enablePagination={false}
          height={420}
          aria-label="Employees"
          onStateChange={() => {
            // The grid can be changed by a tool call, the ask box, or a click
            // on a header. Reading the contract back on every state change
            // keeps the counter honest whichever it was.
            if (agentRef.current) setStats(agentRef.current.contract().stats);
          }}
          ai
          semantics={SEMANTICS}
          agentPolicy={POLICY}
        />
      </GramproAIProvider>

      {!askReady && (
        <p className="text-sm text-zinc-500">
          The ask box is hidden because this app has no model key configured. Put a
          GOOGLE_API_KEY in the repo-root .env and reload — the grid and the buttons above
          work either way.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {log.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No tool calls yet. Press a button above to send what an agent would send.
          </p>
        ) : (
          log.map((entry, index) => {
            const ok = entry.result.ok === true;
            return (
              <div
                key={`${entry.at}-${index}`}
                className="rounded-md border border-zinc-200 p-2 text-xs dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-500">{entry.at}</span>
                  <span className="italic">“{entry.utterance}”</span>
                  <span
                    className={
                      ok
                        ? "rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                        : "rounded bg-rose-100 px-1.5 py-0.5 text-rose-900 dark:bg-rose-900 dark:text-rose-100"
                    }
                  >
                    {String(entry.result.status ?? "?")}
                    {entry.result.layer ? ` · ${String(entry.result.layer)}` : ""}
                    {entry.result.code ? ` · ${String(entry.result.code)}` : ""}
                  </span>
                </div>
                <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  {JSON.stringify(entry.intents)}
                </pre>
                <div className="mt-1">{String(entry.result.message ?? "")}</div>
                {Array.isArray(entry.result.warnings) && entry.result.warnings.length > 0 && (
                  <div className="mt-1 text-zinc-500">{entry.result.warnings.join(" · ")}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
