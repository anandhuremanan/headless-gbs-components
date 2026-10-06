/*
 * Every tier of the benchmark goes through one interface.
 *
 *   id                  what you type after --model
 *   provider / modelId  recorded in the result, exactly
 *   supportsConstrained whether --constrained means anything here
 *   unavailable()       a sentence explaining what is missing, or null
 *   complete(request)   -> { text, latencyMs, usage? }
 *
 * An adapter receives the prompt; it does not build one. It returns text; it
 * does not parse, repair or validate. Everything after `complete` — JSON
 * parsing, the validator, coercion, scoring — is identical for a 70B hosted
 * model, a 1B local model and a keyword matcher, because otherwise the
 * numbers are not comparable and the whole exercise is theatre.
 *
 * The one declared exception is `needsOracle`, which the oracle adapter sets
 * so the runner hands it the expected answer. It exists to test the harness,
 * is excluded from reported benchmarks, and is visible here rather than
 * hidden inside an adapter.
 */

const { build: buildHosted, PROVIDERS } = require("./openai-compatible.cjs");

const ADAPTERS = {
  baseline: () => require("./baseline.cjs"),
  oracle: () => require("./oracle.cjs"),
  anthropic: () => require("./anthropic.cjs"),
  ollama: () => require("./ollama.cjs"),
};

/** Local candidates, by the Ollama tag that serves them. */
const LOCAL_MODELS = {
  "qwen2.5-coder-3b": "qwen2.5-coder:3b",
  "llama-3.2-3b": "llama3.2:3b",
  "xlam-2-1b-fc-r": "hf.co/Salesforce/xLAM-2-1b-fc-r-gguf",
};

/**
 * Shorthands for the ceiling tier.
 *
 * `ceiling` deliberately points at a free provider. The ceiling is a
 * diagnostic — can a capable reader follow this prompt? — and a free
 * 70B-class model answers that as well as a paid frontier one. Making it cost
 * money means it does not get run, and an unrun ceiling leaves every
 * small-model score uninterpretable.
 */
const ALIASES = {
  ceiling: { provider: "gemini" },
  frontier: { adapter: "anthropic", modelId: "claude-opus-5-5" },
};

function resolve(id) {
  if (ADAPTERS[id]) return ADAPTERS[id]();
  if (LOCAL_MODELS[id]) return ADAPTERS.ollama().withModel(LOCAL_MODELS[id], id);

  if (ALIASES[id]) {
    const alias = ALIASES[id];
    if (alias.adapter) return ADAPTERS[alias.adapter]().withModel(alias.modelId, id);
    return buildHosted(alias.provider, alias.modelId, id);
  }

  // provider, or provider:model — the model id actually sent is recorded.
  const [provider, ...rest] = id.split(":");
  if (PROVIDERS[provider]) return buildHosted(provider, rest.join(":") || undefined, id);

  throw new Error(
    `Unknown model "${id}".\n` +
      `  tiers:     ${Object.keys(ADAPTERS).join(", ")}\n` +
      `  aliases:   ${Object.keys(ALIASES).join(", ")}\n` +
      `  hosted:    ${Object.keys(PROVIDERS).join(", ")} (or provider:model-id)\n` +
      `  local:     ${Object.keys(LOCAL_MODELS).join(", ")}`,
  );
}

/** Everything `--all` runs, in the order the decision logic wants them. */
const BENCHMARK_ORDER = ["baseline", "ceiling", ...Object.keys(LOCAL_MODELS)];

module.exports = { resolve, ADAPTERS, ALIASES, LOCAL_MODELS, PROVIDERS, BENCHMARK_ORDER };
