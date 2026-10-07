/*
 * Scoring one case, against the real runtime.
 *
 * Two rules decide everything here.
 *
 * **Score what the grid would do, not what the model typed.** A model that
 * answers `"1 lakh"` and one that answers `100000` are equally right: the
 * coercion layer converts the first, deterministically, which is the whole
 * reason that layer exists. Marking the first wrong would be scoring a model
 * for failing to do arithmetic we deliberately took away from it. So the
 * comparison is between *resulting grid states* — the expected intents and the
 * model's intents are each executed against an identical fresh grid, and the
 * two `GridState`s are compared.
 *
 * **Never be more permissive than the executor.** The expected answers run
 * through the same validator, the same coercion and the same executors as the
 * model's. If the corpus itself fails to validate, that is reported as a
 * harness or contract problem rather than quietly excused — which is what the
 * `oracle` adapter is for.
 *
 * The only substitution is that `export`, `print` and `copy` are recorded
 * instead of performed: they reach for `document` and a file download, and
 * Node has neither. Their arguments are still compared.
 */

const SIDE_EFFECTS = ["exportCsv", "exportExcel", "exportPdf", "print", "copyToClipboard"];

/* ------------------------------------------------------------ canonical form */

/** Deterministic JSON: object keys sorted, `undefined` dropped. */
function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

/** One intent in comparable form. `in` takes a set, so its array is sorted. */
function canonicalIntent(intent) {
  const out = {};
  for (const key of Object.keys(intent).sort()) {
    const value = intent[key];
    if (value === undefined) continue;
    out[key] = key === "value" && Array.isArray(value) ? [...value].map(String).sort() : value;
  }
  return out;
}

const canonicalIntents = (list) => list.map(canonicalIntent);

/* ----------------------------------------------------------------- execution */

/** A fresh grid whose side effects are recorded rather than performed. */
function createMounter(harness, fixture) {
  const rowKey = fixture.getRowId;
  return () => {
    const effects = [];
    const { agent, api } = harness.mount(fixture, {
      wrapApi: (api) => {
        const wrapped = { ...api };
        for (const method of SIDE_EFFECTS) {
          wrapped[method] = async (arg) => {
            effects.push({ method, arg: arg ?? null });
          };
        }
        return wrapped;
      },
    });
    /*
     * The ids of the rows the grid would actually show.
     *
     * This is the weaker, more forgiving notion of "same answer", and it earns
     * its place: `after 2026-09-06` and `between 2026-09-06 and today` are
     * different states that select identical rows on data with no future
     * dates. The state comparison stays authoritative — the two filters are
     * not equivalent in general — but a model that lands on the same rows by
     * another route is nearer to right than one that lands somewhere else, and
     * a benchmark that cannot tell those apart is hiding something useful.
     */
    const visibleRows = () =>
      api
        .getRows("filtered")
        .map((row) => String(row[rowKey]))
        .sort();

    return { agent, api, effects, visibleRows };
  };
}

/**
 * Run setup, then the intents, and report what the grid became.
 *
 * `confirm: true` throughout: a confirmation prompt is a UI concern, and the
 * corpus records whether one was demanded separately.
 */
async function applyIntents(mounter, setup, intents) {
  const { agent, effects, visibleRows } = mounter();

  for (const step of setup ?? []) {
    const result = await agent.execute(step, { confirm: true });
    if (result.status !== "done") {
      return { ok: false, stage: "setup", result, effects };
    }
  }

  const before = agent.contract();
  const checked = agent.respond(intents);
  if (checked.status !== "done" && checked.status !== "needs-confirmation") {
    return { ok: false, stage: "validate", result: checked, effects, before };
  }

  const run = await agent.execute(intents, { confirm: true });
  if (run.status !== "done") return { ok: false, stage: "execute", result: run, effects, before };

  return {
    ok: true,
    state: run.state,
    rows: visibleRows(),
    commands: checked.commands,
    confirmed: checked.status === "needs-confirmation",
    warnings: checked.warnings,
    effects,
  };
}

/**
 * A grid with the case's setup already applied.
 *
 * Validation has to happen from the same state the model was shown, or a case
 * like "undo that" is judged against a grid where nothing has happened yet and
 * every answer is wrong for a reason that has nothing to do with the answer.
 */
async function mountWithSetup(mounter, setup) {
  const { agent, effects } = mounter();
  for (const step of setup ?? []) {
    const result = await agent.execute(step, { confirm: true });
    if (result.status !== "done") {
      throw new Error(`setup was refused: ${result.reason ?? result.status}`);
    }
  }
  return { agent, effects };
}

/**
 * A grid state in comparable form.
 *
 * `setFilter` appends, so filtering by region then by active leaves the array
 * in a different order from the reverse — and the two grids show exactly the
 * same rows, because filters are combined with AND. Sorting them by column
 * stops that being scored as a wrong answer.
 *
 * `sorting`, `columnOrder` and the pinning lists are left alone: their order
 * is what they mean.
 */
const canonicalState = (state) => ({
  ...state,
  filters: [...state.filters].sort((a, b) => a.columnId.localeCompare(b.columnId)),
});

const sameOutcome = (a, b) =>
  stable(canonicalState(a.state)) === stable(canonicalState(b.state)) &&
  stable(a.effects) === stable(b.effects);

/** Same visible rows and same side effects, by whatever route. */
const sameRows = (a, b) =>
  stable(a.rows) === stable(b.rows) && stable(a.effects) === stable(b.effects);

/* ---------------------------------------------------------------- taxonomy */

const KEY_TO_FAILURE = {
  action: "wrong_operation",
  column: "wrong_column",
  operator: "wrong_operator",
  direction: "wrong_direction",
  scope: "wrong_scope",
  format: "wrong_scope",
  target: "wrong_column",
  placement: "wrong_direction",
};

/** The first way two command lists differ, named. */
function classifyDifference(expected, actual) {
  const want = canonicalIntents(expected);
  const got = canonicalIntents(actual);

  if (got.length < want.length) return "missing_operation";
  if (got.length > want.length) return "extra_operation";

  for (let i = 0; i < want.length; i++) {
    const a = want[i];
    const b = got[i];
    if (a.action !== b.action) return "wrong_operation";
    for (const key of Object.keys({ ...a, ...b })) {
      if (stable(a[key]) === stable(b[key])) continue;
      return KEY_TO_FAILURE[key] ?? "wrong_value";
    }
  }
  return "execution_mismatch";
}

/** A validator refusal, attributed to the layer that produced it. */
const LAYER_TO_FAILURE = {
  schema: "schema_failure",
  reference: "validator_failure",
  coercion: "coercion_failure",
  policy: "validator_failure",
  plausibility: "validator_failure",
};

/* -------------------------------------------------------------------- score */

function parseResponse(text) {
  const trimmed = String(text ?? "").trim();
  // A fenced block is a formatting slip, not a semantic error; unwrap it and
  // let the schema judge what is inside.
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const body = fenced ? fenced[1] : trimmed;
  try {
    return { ok: true, value: JSON.parse(body), unfenced: Boolean(fenced) };
  } catch (error) {
    return { ok: false, error: String(error.message).slice(0, 160) };
  }
}

/**
 * Score one case.
 *
 * @returns a record with `outcome`, `correct`, and a `failure` code when wrong.
 */
async function scoreCase({ entry, responseText, latencyMs, usage, mounter }) {
  const base = {
    id: entry.id,
    category: entry.category,
    expect: entry.expect,
    ...(entry.clarify ? { clarify: entry.clarify } : {}),
    ...(entry.clarify === "required" ? { clarifyRequired: true } : {}),
    latencyMs,
    ...(usage ? { usage } : {}),
  };

  const parsed = parseResponse(responseText);
  if (!parsed.ok) {
    // Unintelligible output is not a refusal, and on a case that required a
    // question it is not a question either.
    const correct = entry.expect === "reject" && entry.clarify !== "required";
    return {
      ...base,
      responseKind: "unparseable",
      schemaValid: false,
      validated: false,
      outcome: correct ? "correct_rejection" : "schema_failure",
      correct,
      ...(correct ? { viaSchemaFailure: true } : {}),
      failure: "schema_failure",
      detail: parsed.error,
    };
  }

  const readings =
    entry.expect === "reject" ? [] : [entry.intents, ...(entry.alternatives ?? [])];

  // Run the model's answer first: its validation result decides most branches.
  // From the state the setup left, which is the state the prompt described.
  const probe = await mountWithSetup(mounter, entry.setup);
  const checked = probe.agent.respond(parsed.value);
  const kind =
    checked.status === "clarify"
      ? "clarify"
      : checked.status === "declined"
        ? "declined"
        : "command";
  const schemaValid = !(checked.status === "rejected" && checked.layer === "schema");

  /* ---- the producer asked a question ---- */
  if (checked.status === "clarify") {
    const correct =
      entry.expect === "ambiguous" ||
      entry.clarify === "required" ||
      entry.clarify === "acceptable";
    return {
      ...base,
      responseKind: kind,
      schemaValid: true,
      validated: false,
      question: checked.question,
      outcome: correct ? "correct_clarification" : "unnecessary_clarification",
      correct,
      failure: correct ? null : "unnecessary_clarification",
    };
  }

  /* ---- the producer refused ---- */
  if (checked.status === "declined") {
    /*
     * On a case where clarification is *required*, refusing is not the same as
     * being safe. The request was answerable — a value was missing, or a
     * required argument had no default — so closing the door instead of asking
     * loses information that one question would have recovered.
     */
    if (entry.clarify === "required") {
      return {
        ...base,
        responseKind: kind,
        schemaValid: true,
        validated: false,
        reason: checked.reason,
        outcome: "missed_clarification",
        correct: false,
        failure: "missed_clarification",
      };
    }
    const correct = entry.expect === "reject";
    return {
      ...base,
      responseKind: kind,
      schemaValid: true,
      validated: false,
      reason: checked.reason,
      outcome: correct ? "correct_rejection" : "incorrect_rejection",
      correct,
      failure: correct ? null : "incorrect_rejection",
    };
  }

  /* ---- the validator refused the producer's command ---- */
  if (checked.status === "rejected") {
    if (entry.expect === "reject") {
      /*
       * A guess that the validator happened to catch is still a guess. On a
       * case where asking was required, the validator saving us is the
       * architecture working, not the producer answering well — so it earns no
       * credit here, and `falseAcceptRate` stays clean because nothing ran.
       */
      if (entry.clarify === "required") {
        return {
          ...base,
          responseKind: kind,
          schemaValid,
          validated: false,
          outcome: "missed_clarification",
          correct: false,
          failure: "missed_clarification",
          rejectionCode: checked.code,
          expectedCode: entry.code,
          detail: "guessed a command where the request could not be determined; asking was required",
        };
      }
      return {
        ...base,
        responseKind: kind,
        schemaValid,
        validated: false,
        outcome: "correct_rejection",
        correct: true,
        failure: null,
        rejectionCode: checked.code,
        expectedCode: entry.code,
        rejectionCodeMatch: checked.code === entry.code,
        ...(schemaValid ? {} : { viaSchemaFailure: true }),
      };
    }

    /*
     * The corpus says this should work and the validator says it should not.
     * Before blaming the model, check whether the corpus's own answer would
     * survive — if it would not, the contract or the harness is at fault and
     * saying "model failure" would send someone looking in the wrong place.
     */
    const corpusProbe = await mountWithSetup(mounter, entry.setup);
    const corpusChecked = corpusProbe.agent.respond(entry.intents);
    const architectureSuspect = corpusChecked.status === "rejected";

    return {
      ...base,
      responseKind: kind,
      schemaValid,
      validated: false,
      outcome: "incorrect_rejection",
      correct: false,
      failure: architectureSuspect
        ? "corpus_or_contract_failure"
        : (LAYER_TO_FAILURE[checked.layer] ?? "validator_failure"),
      rejectionCode: checked.code,
      rejectionLayer: checked.layer,
      detail: checked.reason,
      ...(architectureSuspect ? { architectureSuspect: true } : {}),
    };
  }

  /* ---- a command the validator accepted ---- */
  const actualIntents = checked.commands.map((command) => command.intent);

  if (entry.expect === "reject") {
    /*
     * Some refusals have a right answer behind them. "Tier equals gold" is
     * refused because `equals` is illegal on an options column — but
     * `in ["gold"]` is what the person meant, and a producer that emits it has
     * succeeded, not failed. Those readings are listed on the case as
     * `alsoAccept`; everything else that validates is the worst outcome in the
     * benchmark, something running that should not have.
     */
    const actual = await applyIntents(mounter, entry.setup, parsed.value);
    for (const reading of entry.alsoAccept ?? []) {
      const want = await applyIntents(mounter, entry.setup, reading);
      if (want.ok && actual.ok && sameOutcome(want, actual)) {
        return {
          ...base,
          responseKind: kind,
          schemaValid: true,
          validated: true,
          outcome: "acceptable_reading",
          correct: true,
          failure: null,
          note: "refused as written, but this reading is a correct answer",
        };
      }
    }

    return {
      ...base,
      responseKind: kind,
      schemaValid: true,
      validated: true,
      outcome: "false_accept",
      correct: false,
      failure: "unsupported_operation",
      actual: canonicalIntents(actualIntents),
      expectedCode: entry.code,
    };
  }

  const applied = await applyIntents(mounter, entry.setup, parsed.value);
  if (!applied.ok) {
    return {
      ...base,
      responseKind: kind,
      schemaValid,
      validated: true,
      outcome: "incorrect_accept",
      correct: false,
      failure: "execution_mismatch",
      detail: `execution failed at ${applied.stage}: ${applied.result.reason ?? applied.result.status}`,
    };
  }

  for (const [index, reading] of readings.entries()) {
    const want = await applyIntents(mounter, entry.setup, reading);
    if (!want.ok) {
      return {
        ...base,
        responseKind: kind,
        schemaValid,
        validated: true,
        outcome: "harness_error",
        correct: false,
        failure: "corpus_or_contract_failure",
        detail: `the corpus's own reading ${index} does not run: ${want.result.reason ?? want.stage}`,
      };
    }

    if (sameOutcome(want, applied)) {
      const preferred = index === 0;
      return {
        ...base,
        responseKind: kind,
        schemaValid,
        validated: true,
        outcome: preferred && entry.expect === "accept" ? "semantic_correct" : "acceptable_reading",
        correct: true,
        failure: null,
        exactMatch:
          stable(canonicalIntents(want.commands.map((c) => c.intent))) ===
          stable(canonicalIntents(actualIntents)),
        confirmed: applied.confirmed,
        expectedConfirm: entry.confirm === true,
        confirmMatch: entry.confirm === true ? applied.confirmed === true : true,
      };
    }
  }

  const want = await applyIntents(mounter, entry.setup, entry.intents);

  /*
   * Wrong by state, but did it still show the right rows? Reported, never
   * credited: this is diagnosis, not a softer pass mark.
   */
  const rowSetMatch = want.ok && applied.ok ? sameRows(want, applied) : false;

  return {
    ...base,
    responseKind: kind,
    schemaValid,
    validated: true,
    outcome: "incorrect_accept",
    correct: false,
    rowSetMatch,
    failure: want.ok ? classifyDifference(want.commands.map((c) => c.intent), actualIntents) : "execution_mismatch",
    expected: want.ok ? canonicalIntents(want.commands.map((c) => c.intent)) : null,
    actual: canonicalIntents(actualIntents),
  };
}

module.exports = {
  scoreCase,
  createMounter,
  mountWithSetup,
  applyIntents,
  canonicalIntent,
  canonicalIntents,
  classifyDifference,
  canonicalState,
  sameRows,
  parseResponse,
  stable,
  SIDE_EFFECTS,
};
