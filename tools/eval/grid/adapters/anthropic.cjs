/*
 * The ceiling tier: a frontier model over the Anthropic Messages API.
 *
 * This is not a candidate for production. It answers one question — can the
 * prompt, the contract and the schema express the task clearly enough for a
 * capable reader? If the ceiling is weak the problem is upstream of model
 * choice, and benchmarking 3B models would be measuring the wrong thing.
 *
 * No key is read at import time and none is ever written to a result file.
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

function build(modelId, id) {
  return {
    id: id ?? `anthropic:${modelId}`,
    provider: "anthropic",
    modelId,
    // Constrained decoding is not exposed by this API; the schema is in the prompt.
    supportsConstrained: false,

    unavailable() {
      return process.env.ANTHROPIC_API_KEY
        ? null
        : "ANTHROPIC_API_KEY is not set. Export it, or run a tier that needs no credentials " +
            "(`--model=baseline`).";
    },

    async complete({ system, user, temperature = 0, maxTokens = 1024, signal }) {
      const started = process.hrtime.bigint();
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: user }],
        }),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 400)}`);
      }

      const body = await response.json();
      const text = (body.content ?? [])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      return {
        text,
        latencyMs: Number(process.hrtime.bigint() - started) / 1e6,
        usage: body.usage
          ? { inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens }
          : undefined,
      };
    },
  };
}

module.exports = { ...build("claude-opus-5-5"), withModel: build };
