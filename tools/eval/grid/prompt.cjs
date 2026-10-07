/*
 * What the model sees. One builder, every model, no exceptions.
 *
 * If adapters were allowed to write their own prompts, a benchmark would be
 * comparing prompts and reporting it as a comparison of models. So this is the
 * only place a prompt is constructed, it is versioned, and the version is
 * recorded in every result file. Changing anything here means a new version
 * and results that are not comparable with the old ones.
 *
 * Two decisions worth stating, because they are what the prompt is *for*:
 *
 *   The model is told not to do arithmetic. "1 lakh" should be passed through
 *   as written. The coercion layer converts it deterministically, and a model
 *   that multiplies is a model that will eventually multiply wrong, silently.
 *   The same goes for percentages, currency and relative dates.
 *
 *   The model is given three ways to answer. A producer that can only emit a
 *   command has to guess when a request is ambiguous, and a confident wrong
 *   filter is the failure this whole architecture exists to prevent. Asking is
 *   a correct answer, and the scorer treats it as one.
 *
 * No dataset rows appear here. The runtime contract carries counts and bounded
 * summaries only, and `assertNoRows` in the runner proves it per case.
 */

const PROMPT_VERSIONS = {
  /** The response schema, serialised in full. Verbose, and works unconstrained. */
  v1: "grid-intent-v1",
  /**
   * The same semantics without the JSON Schema: ~4,300 tokens becomes ~1,700.
   *
   * Two reasons, and the second is the one that matters. A constrained decoder
   * already holds the schema as a token mask, so repeating it in the prompt
   * buys nothing. And a 1B model in a browser must read every one of those
   * tokens before it can answer — at 4,300 that is seconds of prefill on a
   * phone, which is the difference between a feature and a demo.
   *
   * Nothing semantic is dropped. Operator sets, option values and column types
   * are all still here; what goes is one serialisation of them. Each operation
   * gains its argument names instead, derived from the same definitions the
   * schema was generated from.
   */
  v2: "grid-intent-v2",
};

/** What a caller gets if it does not ask for a version. */
const PROMPT_VERSION = PROMPT_VERSIONS.v1;

/** Relative date phrases the coercion layer resolves. Kept in step with coerce.ts. */
const DATE_PHRASES =
  "today, yesterday, tomorrow, this week, last week, this month, last month, " +
  "this quarter, last quarter, this year, last year, and \"last N days/weeks/months/years\"";

const num = (value) =>
  typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : String(value);

/** One line per column: everything a reader needs to pick one, and nothing else. */
function describeColumn(column) {
  const bits = [`${column.id} (${column.label})`, column.type];

  if (column.unit) bits.push(column.unit === "%" ? "percent" : column.unit);
  if (column.percentBasis === "fraction") bits.push("stored as a fraction, so 40% is 0.4");
  if (column.higherIsBetter === true) bits.push("higher is better");
  if (column.higherIsBetter === false) bits.push("lower is better");

  const head = bits.join(" · ");
  const lines = [];

  if (column.restricted) {
    lines.push(`  ${head}\n    RESTRICTED: cannot be filtered or sorted.`);
    return lines.join("\n");
  }

  const parts = [];
  parts.push(column.operators.length > 0 ? `filter: ${column.operators.join(" ")}` : "not filterable");
  if (column.sortable) parts.push("sortable");
  if (!column.visible) parts.push("currently hidden");

  if (column.options) {
    parts.push(`options (use the value, not the label): ${column.options.map((o) => `${o.value}="${o.label}"`).join(", ")}`);
  } else if (column.stats && column.stats.kind === "string" && column.stats.values) {
    parts.push(`values: ${column.stats.values.join(", ")}`);
  } else if (column.stats && column.stats.kind === "number") {
    parts.push(`range ${num(column.stats.min)} to ${num(column.stats.max)}`);
  } else if (column.stats && column.stats.kind === "date") {
    parts.push(`range ${column.stats.min} to ${column.stats.max}`);
  } else if (column.stats && column.stats.kind === "boolean") {
    parts.push(`${column.stats.true} true, ${column.stats.false} false`);
  }

  if (column.synonyms && column.synonyms.length > 0) {
    parts.push(`also called: ${column.synonyms.join(", ")}`);
  }

  lines.push(`  ${head}`);
  if (column.description) lines.push(`    ${column.description}`);
  lines.push(`    ${parts.join("; ")}`);
  return lines.join("\n");
}

function describeState(contract) {
  const { state, stats } = contract;
  const lines = [];
  lines.push(
    state.filters.length === 0
      ? "  filters: none"
      : `  filters: ${state.filters
          .map((f) => `${f.column} ${f.operator}${f.value === undefined ? "" : ` ${JSON.stringify(f.value)}`}`)
          .join("; ")}`,
  );
  lines.push(`  search: ${state.search === "" ? "empty" : JSON.stringify(state.search)}`);
  lines.push(
    state.sorting.length === 0
      ? "  sort: none"
      : `  sort: ${state.sorting.map((s) => `${s.column} ${s.direction}`).join(", ")}`,
  );
  lines.push(`  page ${state.page.index + 1} of ${state.page.count}, ${state.page.size} rows per page`);
  lines.push(`  selected: ${state.selection.count} row(s)`);
  if (state.hiddenColumns.length > 0) lines.push(`  hidden columns: ${state.hiddenColumns.join(", ")}`);
  lines.push(
    `  rows: ${stats.filteredRows === null ? "unknown (server mode)" : num(stats.filteredRows)} showing` +
      `${stats.totalRows === null ? "" : ` of ${num(stats.totalRows)} total`}`,
  );
  lines.push(`  undo available: ${state.canUndo ? "yes" : "no"}; redo available: ${state.canRedo ? "yes" : "no"}`);
  return lines.join("\n");
}

function describeOperations(contract, operations) {
  return contract.operations
    .map((name) => `  ${name} — ${operations[name].summary}`)
    .join("\n");
}

/** `filter(column, operator, value, [value2])` — optional arguments bracketed. */
function signatureOf(definition) {
  const input = definition.input;
  if (!input || !input.properties) return `${definition.name}()`;
  const required = new Set(input.required ?? []);
  const args = Object.keys(input.properties).map((key) => (required.has(key) ? key : `[${key}]`));
  return `${definition.name}(${args.join(", ")})`;
}

function describeOperationsWithArguments(contract, operations) {
  return contract.operations
    .map((name) => `  ${signatureOf(operations[name])} — ${operations[name].summary}`)
    .join("\n");
}

/*
 * What v2 says in place of the schema: the three envelope shapes, and one
 * worked example per argument kind. With the signatures above, that is enough
 * to infer the rest — and it costs about a hundred tokens rather than 2,700.
 */
const SHAPE = [
  "OUTPUT SHAPE",
  '  { "result": "command", "intents": [ {"action": "...", ...}, ... ] }',
  '  { "result": "clarify", "question": "..." }',
  '  { "result": "declined", "reason": "..." }',
  "",
  "  Each intent names an action from the list above and fills its arguments:",
  '    { "action": "filter", "column": "revenue", "operator": "gt", "value": "1 lakh" }',
  '    { "action": "sort", "column": "revenue", "direction": "desc" }',
  '    { "action": "export", "format": "csv", "scope": "filtered" }',
  '    { "action": "undo" }',
].join("\n");

const RULES = [
  "Use only the column ids, operators and option values listed above. Nothing else exists.",
  "Pass values through as the person wrote them. Do NOT convert units, scales, percentages or currency: " +
    '"1 lakh", "2 crore", "500k", "20%" and "₹1,00,000" are all understood and converted exactly, downstream. ' +
    "Converting them yourself is the one way to be silently wrong.",
  `For relative dates write the phrase itself — ${DATE_PHRASES} — rather than working out a date.`,
  "A column with options is filtered by membership: use the `in` operator and an array of option values.",
  "A column holds one filter at a time. Two filters on the same column is not a way to say OR.",
  "Several filters on different columns are combined with AND. Emit one intent per column.",
  "When the request has more than one defensible reading on this grid, answer with `clarify` and ask. " +
    "Guessing is worse than asking.",
  "When this grid cannot do what was asked — there is no grouping, no aggregation, no charting, no row " +
    "editing, no top-N limit — answer with `declined` and say so plainly.",
  "Answer with JSON and nothing else. No prose, no explanation, no markdown fence.",
];

/**
 * The prompt for one utterance against one live contract.
 *
 * @param {object} input
 * @param {object} input.contract        from `agent.contract()`
 * @param {object} input.responseSchema  from `agent.responseSchema()`
 * @param {object} input.operations      GRID_OPERATIONS, for the summaries
 * @param {string} input.utterance
 * @returns {{ system: string, user: string, promptVersion: string }}
 */
function buildPrompt({ contract, responseSchema, operations, utterance, version = "v1" }) {
  const promptVersion = PROMPT_VERSIONS[version];
  if (!promptVersion) {
    throw new Error(
      `Unknown prompt version "${version}". Known: ${Object.keys(PROMPT_VERSIONS).join(", ")}`,
    );
  }
  const terse = version === "v2";

  const system = [
    "You turn a person's request into operations on one data grid.",
    "",
    "Answer with exactly one JSON object, of one of three kinds:",
    '  { "result": "command", "intents": [ ... ] }   apply these operations, in order',
    '  { "result": "clarify", "question": "..." }    the request has more than one reading',
    '  { "result": "declined", "reason": "..." }     this grid cannot do that',
    "",
    `THIS GRID (${contract.component}, contract ${contract.contractVersion})`,
    "",
    "Columns:",
    contract.columns.map(describeColumn).join("\n"),
    "",
    "Current state:",
    describeState(contract),
    "",
    "Operations available on this grid:",
    terse
      ? describeOperationsWithArguments(contract, operations)
      : describeOperations(contract, operations),
    "",
    "RULES",
    RULES.map((rule, i) => `  ${i + 1}. ${rule}`).join("\n"),
    "",
    terse ? SHAPE : "Your answer must validate against this JSON Schema:",
    terse ? null : JSON.stringify(responseSchema),
  ]
    .filter((part) => part !== null)
    .join("\n");

  return { system, user: utterance, promptVersion };
}

module.exports = {
  buildPrompt,
  PROMPT_VERSION,
  PROMPT_VERSIONS,
  DATE_PHRASES,
  signatureOf,
};
