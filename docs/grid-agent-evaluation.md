# Evaluating a grid intent model

```
utterance → prompt → model → JSON → validator + coercion → command → score
```

This measures whether a model can drive the DataGrid agent runtime safely. It
is an instrument, so most of the design is about not fooling ourselves: the
same prompt for every model, the same validator the production runtime uses,
and a self-test that fails loudly when the harness itself is wrong.

```bash
npm run eval:grid                          # what the corpus contains
npm run eval:grid -- --model=oracle        # harness self-test; must be 100%
npm run eval:grid -- --model=baseline      # the difficulty floor
npm run eval:grid -- --model=frontier      # the ceiling   (ANTHROPIC_API_KEY)
npm run eval:grid -- --model=qwen2.5-coder-3b --constrained   # a candidate (Ollama)
npm run eval:grid -- --all
```

## What is measured, and what is not

**Not the model's JSON.** A model that answers `"1 lakh"` and one that answers
`100000` are equally right. The coercion layer converts the first,
deterministically, which is the entire reason that layer exists — scoring the
raw string would penalise a model for declining to do arithmetic we
deliberately took away from it.

**The resulting grid.** Each answer is executed against a fresh grid, and the
`GridState` it produces is compared with the state the corpus's answer
produces. Two different intents that leave the grid in the same place are both
correct, which is the honest definition and falls out for free.

The comparison canonicalises one thing: the order of filters on different
columns. `setFilter` appends, so filtering by region then by active leaves a
different array from the reverse — and the two grids show exactly the same
rows, because filters are AND-combined. Sort order, column order and pinning
order are left alone, because for those the order *is* the meaning.

**`export`, `print` and `copy` are recorded, not performed.** They reach for
`document` and a file download; Node has neither. Their arguments are still
compared. Nothing else is substituted — the contract, the validator, the
coercion and every state-changing executor are the production ones.

## Three answers, not one

A producer that can only emit a command has to guess when a request is
ambiguous, and a confident wrong filter is the failure this whole architecture
exists to prevent. So the response envelope has three shapes, all schema-checked:

```jsonc
{ "result": "command",  "intents": [ … ] }                 // apply these, in order
{ "result": "clarify",  "question": "Which measure…?" }    // more than one reading
{ "result": "declined", "reason": "This grid cannot group." }
```

Clarifying is not a way around the validator. `{ "result": "clarify" }` with no
question comes back rejected — a label is not a question. A `declined` with no
reason likewise.

How they score:

| Case | `command` | `clarify` | `declined` |
| --- | --- | --- | --- |
| **accept** | correct if the grid matches | `unnecessary_clarification` — wrong | `incorrect_rejection` — wrong |
| **ambiguous** | correct if it matches any listed reading | **correct** | `incorrect_rejection` — wrong |
| **reject** | **`false_accept`** unless the case lists it under `alsoAccept` | wrong, unless `clarifyOk` | **correct** |

Two of those deserve emphasis. An unnecessary clarification is wrong but it is
*not* a false accept, and the report keeps them apart: wasting someone's time
is not the same failure as putting a wrong number in front of them. And a
correct rejection that arrived because the model emitted unparseable garbage is
counted, but recorded separately as `rejectionsViaMalformedOutput` — being
unintelligible is not the same skill as reasoning that a grid cannot group.

## The prompt

One builder, `tools/eval/grid/prompt.cjs`, version `grid-intent-v1`, recorded in
every result. Adapters receive a prompt; they never construct one. If they
could, the benchmark would be comparing prompts and calling it a comparison of
models.

It contains the runtime contract rendered for reading — one line per column
with type, unit, operators, options or derived values, and synonyms — the
current state after the case's setup, the operations this instance offers, nine
rules, and the generated response schema.

Two rules do most of the work:

- **Do not convert anything.** Scales, currency, percentages and relative dates
  are passed through as written. A model that multiplies by 100,000 will
  eventually multiply wrong, and nothing downstream will notice.
- **Ask rather than guess**, and **decline rather than approximate**.

The prompt contains no date. Relative phrases are passed through as phrases, so
`grid-intent-v1` renders identically today and next year — a prompt with a
clock in it cannot be compared across runs.

### The prompt is built after setup

A case with `setup` has it applied before the prompt is rendered, so a model
answering *"undo that"* sees a contract where undo is available, and one
answering *"go to page 3"* sees the page count the setup produced. Building
every prompt from the pristine grid would be simpler and would quietly make a
third of the corpus unanswerable.

### No rows reach the model

`identifyingValues` collects every value of every string column the contract
declines to enumerate — identifier columns, by the cardinality rule in
`contract.ts` — plus every restricted column, and asserts none of them appears
in the prompt. Per case, not once. Categories like `Kerala` and options like
`Platinum` are expected and allowed: the first is a bounded summary, the second
is column configuration.

## The tiers, in the order they must be run

**1. Oracle.** Replays the corpus's own answers. It must score **100%**, and
until it does, no other number means anything. It earned its place the first
time it ran: it scored 95.2%, which turned out to be the scorer validating each
answer against a pristine grid instead of the one the case's setup had left
behind. Eleven cases, a real bug, found before any model was involved.

**2. Baseline.** Keyword rules, deliberately not clever, allowed to read the
contract so the comparison is fair. It answers the question model scores cannot
answer alone: how much of this corpus is just pattern matching? Resisting the
urge to improve it is part of the design — every rule added to chase a case
makes the floor less honest.

**3. Ceiling.** One strong general-purpose model. **Not a production
candidate, and it does not have to be expensive.** It answers one question: can
the prompt, the contract and the schema express this task clearly enough for a
capable reader? If the ceiling is weak, the fix is upstream of model choice, and
benchmarking 3B models would be measuring the wrong thing.

A free 70B-class model answers that question as well as a paid frontier one, so
`--model=ceiling` points at a free provider. An unrun ceiling leaves every
small-model score uninterpretable, and a ceiling that costs money is a ceiling
that does not get run.

| `--model=` | Key | Cost | Fit for a 230-case run |
| --- | --- | --- | --- |
| `ceiling` / `gemini` | `GOOGLE_API_KEY` | free, no card | **best.** 1,500 req/day and a roomy token-per-minute budget cover a full run in about half an hour |
| `groq` | `GROQ_API_KEY` | free, no card | plenty of requests, but the tokens-per-minute cap is the binding limit — this prompt is ~4.5k tokens, so expect to run it slowly with `--rpm` |
| `huggingface` | `HF_TOKEN` | free credits, small | the router reaches 200+ models through one token; the monthly free credit covers a slice, not a full run |
| `openrouter` | `OPENROUTER_API_KEY` | free models, daily cap | the per-day cap on `:free` models is below 230 until the account has bought credits |
| `openai`, `frontier` | paid | paid | no diagnostic advantage over the free options |

Any provider also takes `provider:model-id`, and the id actually sent is what
the result file records:

```bash
npm run eval:grid -- --model=huggingface:meta-llama/Llama-3.3-70B-Instruct
npm run eval:grid -- --model=groq --rpm=8 --concurrency=1
```

Free tiers throttle, so a 429 is retried with backoff — honouring the
provider's own `retry-after` — and `--rpm=N` spaces requests across all
workers. Check the provider's current limits before a long run; they move.

**4. Local candidates.** Qwen2.5-Coder 3B, Llama 3.2 3B, xLAM-2-1B-FC-R, via
Ollama, constrained and unconstrained.

```
frontier weak ──→ fix the prompt / contract / schema, then start again
frontier strong ──→ baseline ──→ local models
```

## Metrics

**Primary: `endToEndAccuracy`** — did the answer survive validation and
coercion and produce the expected result?

One number would hide the only distinction that matters. These two models are
not equally useful:

```
A: 85% correct,  1% false accepts, 14% asks or refuses
B: 85% correct, 14% false accepts,  1% asks or refuses
```

A is shippable. B silently applies the wrong filter to one request in seven, to
someone who will act on the result. So `falseAcceptRate` is reported beside the
headline and weighted hardest in `eval/policy.json`.

Also reported: `semanticAccuracy`, `correctRejectionRate`,
`correctClarificationRate`, `unnecessaryClarificationRate`, `schemaValidity`,
`validatorAcceptanceRate`, `executionCorrect`, `exactMatchRate`,
`rejectionCodeMatchRate`, latency p50/p95, accuracy per category, and the hard
set.

## Failure taxonomy

Every wrong answer gets a cause, because "model failure" is not a diagnosis:

`wrong_operation` · `wrong_column` · `wrong_operator` · `wrong_value` ·
`wrong_direction` · `wrong_scope` · `missing_operation` · `extra_operation` ·
`unsupported_operation` · `incorrect_rejection` · `unnecessary_clarification` ·
`schema_failure` · `validator_failure` · `coercion_failure` ·
`execution_mismatch` · `adapter_error` · `corpus_or_contract_failure`

The last one matters most. When the validator refuses a model's answer on a
case the corpus says should work, the harness re-runs **the corpus's own
answer**. If that is refused too, the contract or the corpus is at fault, the
record is flagged `architectureSuspect`, and the report lists it under *"Not the
model's fault"*. Blaming a model for a contract bug sends someone looking in
the wrong place for a day.

## The hard set

`eval/grid/v0/hard-set.json` — 42 cases across fourteen groups, each with the
reason it is hard. Drawn from what actually surprised us while building the
runtime: option columns being `in`-only, no `notIn`, no multi-value filter on a
plain string column, no top-N, the two percent columns with different bases,
Indian digit grouping, spans used with `before`, policy-closed columns.

**Frozen.** Never add or remove an id in response to a benchmark result; a hard
set edited after seeing scores measures nothing. A genuinely new class of
difficulty opens v1 instead.

### One exception, declared

Three cases were amended **after** the baseline run, and the reason is recorded
here rather than buried: `grid-218`, `grid-219` and `grid-220` listed only the
wrong answer a model might give, so a producer emitting the *right* command
scored as a false accept. `"Tier equals gold"` is refused as written because
`equals` is illegal on an options column — but `in ["gold"]` is what the person
meant, and a producer that emits it has succeeded.

They now carry `alsoAccept`. Two more (`grid-046`, `grid-222`) carry
`clarifyOk`, because for an inexpressible request and an incomplete one, asking
is a reasonable answer.

This was a defect in the instrument, found by the baseline — which is not a
candidate for anything, so there was no score to inflate. Hard-set membership
did not change. The before/after is in the report below.

## Reproducibility

Every result records `timestamp`, `promptVersion`, `corpusVersion`,
`contractVersion`, `passportVersion`, `libraryVersion`, `hardSetVersion`,
`modelId`, `provider`, `decodingMode`, `temperature`, `maxTokens`, `runtime` and
`platform`. Results across different prompt or corpus versions are not
comparable; say so rather than putting them in the same table.

### Where the key goes

Easiest is a `.env` at the repository root — it is gitignored, and the CLI
prints the *names* it read, never the values:

```ini
GOOGLE_API_KEY=AQ...
```

```bash
cp .env.example .env     # then fill in whichever tier you want
```

A real environment variable always overrides `.env`, so CI secrets are never
shadowed by a stale local file. Setting one by hand differs per shell, which is
the main reason `.env` is the better answer:

```bash
export GOOGLE_API_KEY=…                 # bash, zsh
$env:GOOGLE_API_KEY = "…"               # PowerShell
set GOOGLE_API_KEY=…                    # cmd.exe
```

Credentials are never written to a result, and a missing one produces a
sentence saying which:

```
skipped — ANTHROPIC_API_KEY is not set. Export it, or run a tier that needs
no credentials (`--model=baseline`).
```

Output lands in `eval/results/grid/<timestamp>-<model>.json`, with the latest
run rendered to `eval/results/grid/latest.md`.

## First results

Run on 2026-10-06, `grid-intent-v1`, corpus `grid-v0` (230 cases), contract
`1.0.0`, unconstrained.

| Tier | End-to-end | False accept | Hard set | Status |
| --- | ---: | ---: | ---: | --- |
| Oracle (self-test) | **100.0%** | 0.0% | 100.0% | harness verified |
| Baseline (keyword rules) | **47.0%** | 7.7% | 69.0% | floor established |
| Ceiling | — | — | — | needs `GOOGLE_API_KEY` (free) |
| Qwen2.5-Coder 3B | — | — | — | needs Ollama |
| Llama 3.2 3B | — | — | — | needs Ollama |
| xLAM-2-1B-FC-R | — | — | — | needs Ollama |

Baseline before the corpus fix: 46.5% end-to-end, 10.3% false accept, 66.7%
hard set. Three of its four false accepts were the mis-specified cases
described above, not model-shaped errors.

Where the baseline stands and falls:

```
unsupported          100%    declines anything it cannot match, which is right here
wrong-column         100%    same reason
wrong-operator       100%    same reason
scale                 85%    the amount regex does most of this
case                  83%
search                75%
export                71%
clear                 60%
history               56%
pagination            50%
selection             42%
sort                  35%
filter-simple         30%
relative               7%
ambiguous              0%    no rule can ask a question
columns                0%
filter-compound        0%    one rule fires, so half the request is dropped
```

Read two things from that. The 100% rows are not competence — a matcher that
declines whatever it does not recognise gets every "this is impossible" case
right for free, which is why `correctRejectionRate` is reported next to, and
not inside, the headline. And `filter-compound` at 0% with 20
`missing_operation` failures is the shape of the floor: single-clause requests
are patterns, multi-clause requests are comprehension.

**What this does not yet tell us.** Whether the prompt is good enough. That is
the frontier tier's job and it has not run. Until it does, the 47% floor is the
only calibrated number here, and no conclusion about local models or
fine-tuning is available.

## Running the next tier

```bash
# Free, no card: aistudio.google.com → create an API key → put it in .env
node tools/eval/grid/cli.cjs --model=ceiling --limit=1   # smoke test first
node tools/eval/grid/cli.cjs --model=ceiling --rpm=8 --concurrency=2

# then, if the ceiling is strong
ollama pull qwen2.5-coder:3b
npm run eval:grid -- --model=qwen2.5-coder-3b --constrained
npm run eval:grid -- --model=qwen2.5-coder-3b --unconstrained
```

The constrained/unconstrained pair is worth running on the same model: it
separates "cannot produce valid JSON" from "produces valid JSON about the wrong
column", and those have completely different remedies.

### How results decide the fine-tuning question

- **Ceiling below ~90%** → the prompt or the contract is unclear. Fix that.
  Nothing about model size has been learned.
- **Ceiling strong, best local model within a few points** → ship the local
  model. No fine-tune.
- **Ceiling strong, local models far behind with low `falseAcceptRate`** →
  a candidate for fine-tuning: the failure is capability, not safety.
- **Local models far behind with high `falseAcceptRate`** → do not ship, and do
  not fine-tune yet. Confident wrong answers are a prompt and contract problem
  first; a fine-tune on a corpus this size would teach confidence, not accuracy.

## Files

```
tools/eval/grid/
├── prompt.cjs            grid-intent-v1; the only place a prompt is built
├── adapters/
│   ├── index.cjs         registry, aliases, local model tags
│   ├── baseline.cjs      keyword rules — the floor
│   ├── oracle.cjs        replays expected answers — the self-test
│   ├── openai-compatible.cjs  gemini · groq · huggingface · openrouter · openai
│   ├── anthropic.cjs     paid frontier, kept for comparison
│   └── ollama.cjs        local candidates, constrained or not
├── scorer.cjs            post-coercion comparison, execution, taxonomy
├── metrics.cjs           aggregation, policy check, the markdown report
├── runner.cjs            orchestration, metadata, the no-row guarantee
└── cli.cjs               npm run eval:grid

tools/ts-require.cjs      lets the CJS harness load the TypeScript runtime
tools/env.cjs             reads .env; a real environment variable still wins
.env.example              copy to .env and fill in a key
eval/grid/v0/             fixture.json · cases.jsonl · hard-set.json
eval/policy.json          the provisional shipping bar
eval/results/grid/        every run, plus latest.md
```

`tools/eval` is excluded from the npm package; none of this ships.
