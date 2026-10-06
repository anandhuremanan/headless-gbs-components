/*
 * Turning per-case records into the numbers a decision gets made from.
 *
 * One accuracy figure would hide the only distinction that matters. These two
 * models are not equally useful:
 *
 *   A: 85% correct, 1% false accepts, 14% asks or refuses
 *   B: 85% correct, 14% false accepts, 1% asks or refuses
 *
 * A is shippable. B silently applies the wrong filter to one request in seven,
 * and the person reads the result as fact. So `falseAcceptRate` is reported
 * beside the headline, the policy file weights it hardest, and refusing or
 * asking is never counted as the same kind of wrong as acting wrongly.
 */

const OUTCOMES = [
  "semantic_correct",
  "acceptable_reading",
  "correct_clarification",
  "correct_rejection",
  "incorrect_accept",
  "incorrect_rejection",
  "unnecessary_clarification",
  "false_accept",
  "schema_failure",
  "harness_error",
];

const pct = (n, d) => (d === 0 ? null : Math.round((n / d) * 1000) / 1000);

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[index] * 10) / 10;
}

function tally(records, key) {
  const out = {};
  for (const record of records) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

function summarise(records, { hardSet = [] } = {}) {
  const total = records.length;
  const count = (predicate) => records.filter(predicate).length;

  const accept = records.filter((r) => r.expect === "accept");
  const reject = records.filter((r) => r.expect === "reject");
  const ambiguous = records.filter((r) => r.expect === "ambiguous");
  const hard = records.filter((r) => hardSet.includes(r.id));

  const outcomes = tally(records, "outcome");
  for (const name of OUTCOMES) outcomes[name] ??= 0;

  const byCategory = {};
  for (const record of records) {
    const bucket = (byCategory[record.category] ??= { total: 0, correct: 0 });
    bucket.total += 1;
    if (record.correct) bucket.correct += 1;
  }
  for (const bucket of Object.values(byCategory)) bucket.accuracy = pct(bucket.correct, bucket.total);

  const latencies = records.map((r) => r.latencyMs).filter((n) => typeof n === "number");

  return {
    total,
    outcomes,
    primary: {
      /* Did the answer survive validation and produce the expected result? */
      endToEndAccuracy: pct(count((r) => r.correct), total),
    },
    secondary: {
      semanticAccuracy: pct(
        count((r) => r.correct && r.expect !== "reject"),
        accept.length + ambiguous.length,
      ),
      correctRejectionRate: pct(count((r) => r.expect === "reject" && r.correct), reject.length),
      correctClarificationRate: pct(
        count((r) => r.outcome === "correct_clarification"),
        ambiguous.length,
      ),
      /* The dangerous one: a refused request that ran anyway. */
      falseAcceptRate: pct(count((r) => r.outcome === "false_accept"), reject.length),
      unnecessaryClarificationRate: pct(
        count((r) => r.outcome === "unnecessary_clarification"),
        accept.length + reject.length,
      ),
      schemaValidity: pct(count((r) => r.schemaValid), total),
      validatorAcceptanceRate: pct(count((r) => r.validated), total),
      /* Of the commands that validated, how many produced the expected state. */
      executionCorrect: pct(
        count((r) => r.validated && r.correct),
        count((r) => r.validated),
      ),
      exactMatchRate: pct(count((r) => r.exactMatch === true), count((r) => r.correct && r.expect !== "reject")),
      rejectionCodeMatchRate: pct(
        count((r) => r.rejectionCodeMatch === true),
        count((r) => r.expect === "reject" && r.rejectionCode !== undefined),
      ),
      /* Correct refusals that came from malformed output rather than reasoning. */
      rejectionsViaMalformedOutput: count((r) => r.viaSchemaFailure === true),
    },
    hardSet: hard.length === 0 ? null : { total: hard.length, accuracy: pct(hard.filter((r) => r.correct).length, hard.length) },
    byCategory,
    failures: tally(records.filter((r) => !r.correct), "failure"),
    latencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
    /* A corpus or contract problem wearing a model-failure costume. */
    architectureSuspects: records.filter((r) => r.architectureSuspect).map((r) => r.id),
  };
}

/** Does this run clear the shipping bar? Advisory; the policy file is editable. */
function checkPolicy(summary, policy) {
  const checks = [
    ["overallEndToEndAccuracy", summary.primary.endToEndAccuracy, "at least", policy.overallEndToEndAccuracy],
    ["hardSetAccuracy", summary.hardSet?.accuracy ?? null, "at least", policy.hardSetAccuracy],
    ["falseAcceptRate", summary.secondary.falseAcceptRate, "at most", policy.falseAcceptRate],
    ["correctRejectionRate", summary.secondary.correctRejectionRate, "at least", policy.correctRejectionRate],
  ];

  const results = checks
    .filter(([, value, , threshold]) => value !== null && threshold !== undefined)
    .map(([name, value, direction, threshold]) => ({
      name,
      value,
      threshold,
      direction,
      pass: direction === "at least" ? value >= threshold : value <= threshold,
    }));

  return { pass: results.every((r) => r.pass), results };
}

/* -------------------------------------------------------------- the report */

const show = (value) => (value === null ? "n/a" : `${(value * 100).toFixed(1)}%`);
const padTo = (text, width) => String(text).padEnd(width);

function renderMarkdown(run) {
  const { meta, summary, policy } = run;
  const lines = [];

  lines.push(`# Grid intent evaluation — ${meta.modelId}`, "");
  lines.push(
    "| | |",
    "| --- | --- |",
    `| Model | \`${meta.modelId}\` (${meta.provider}) |`,
    `| Adapter | \`${meta.model}\` |`,
    `| Decoding | ${meta.decodingMode} |`,
    `| Prompt | \`${meta.promptVersion}\` |`,
    `| Corpus | \`${meta.corpusVersion}\` (${summary.total} cases) |`,
    `| Contract | \`${meta.contractVersion}\` · passport \`${meta.passportVersion}\` |`,
    `| Temperature | ${meta.temperature} |`,
    `| Run at | ${meta.timestamp} |`,
    `| Runtime | ${meta.runtime} on ${meta.platform} |`,
    "",
  );

  lines.push("## Headline", "");
  lines.push(`**End-to-end accuracy: ${show(summary.primary.endToEndAccuracy)}**`, "");
  lines.push(
    "| Metric | Value |",
    "| --- | --- |",
    `| Semantic accuracy (accept + ambiguous) | ${show(summary.secondary.semanticAccuracy)} |`,
    `| Correct rejection rate | ${show(summary.secondary.correctRejectionRate)} |`,
    `| Correct clarification rate | ${show(summary.secondary.correctClarificationRate)} |`,
    `| **False accept rate** | **${show(summary.secondary.falseAcceptRate)}** |`,
    `| Unnecessary clarification rate | ${show(summary.secondary.unnecessaryClarificationRate)} |`,
    `| Schema validity | ${show(summary.secondary.schemaValidity)} |`,
    `| Validator acceptance | ${show(summary.secondary.validatorAcceptanceRate)} |`,
    `| Execution correct (of validated) | ${show(summary.secondary.executionCorrect)} |`,
    `| Exact intent match (of correct) | ${show(summary.secondary.exactMatchRate)} |`,
    `| Rejection code match | ${show(summary.secondary.rejectionCodeMatchRate)} |`,
    "",
  );

  if (summary.hardSet) {
    lines.push(`Hard set: **${show(summary.hardSet.accuracy)}** over ${summary.hardSet.total} cases.`, "");
  }

  if (policy) {
    lines.push("## Shipping policy", "");
    lines.push("| Check | Value | Bar | |", "| --- | --- | --- | --- |");
    for (const result of policy.results) {
      lines.push(
        `| ${result.name} | ${show(result.value)} | ${result.direction} ${show(result.threshold)} | ${result.pass ? "pass" : "**fail**"} |`,
      );
    }
    lines.push("", policy.pass ? "**Clears the bar.**" : "**Does not clear the bar.**", "");
  }

  lines.push("## Latency", "");
  lines.push(`p50 ${summary.latencyMs.p50 ?? "n/a"} ms · p95 ${summary.latencyMs.p95 ?? "n/a"} ms`, "");

  lines.push("## By category", "");
  lines.push("| Category | Cases | Accuracy |", "| --- | ---: | ---: |");
  for (const [category, bucket] of Object.entries(summary.byCategory).sort(
    (a, b) => (a[1].accuracy ?? 0) - (b[1].accuracy ?? 0),
  )) {
    lines.push(`| ${category} | ${bucket.total} | ${show(bucket.accuracy)} |`);
  }
  lines.push("");

  lines.push("## Outcomes", "");
  for (const [name, n] of Object.entries(summary.outcomes).sort((a, b) => b[1] - a[1])) {
    if (n > 0) lines.push(`- ${padTo(name, 28)} ${n}`);
  }
  lines.push("");

  const failures = Object.entries(summary.failures).sort((a, b) => b[1] - a[1]);
  if (failures.length > 0) {
    lines.push("## Failures", "");
    for (const [name, n] of failures) lines.push(`- ${padTo(name, 28)} ${n}`);
    lines.push("");
  }

  if (summary.architectureSuspects.length > 0) {
    lines.push(
      "## Not the model's fault",
      "",
      "The corpus's own answer was also refused for these, so the contract or the corpus " +
        "is what needs looking at:",
      "",
      summary.architectureSuspects.map((id) => `- \`${id}\``).join("\n"),
      "",
    );
  }

  return lines.join("\n");
}

module.exports = { summarise, checkPolicy, renderMarkdown, percentile, OUTCOMES };
