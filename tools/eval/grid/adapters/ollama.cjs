/*
 * Local candidates, served by Ollama.
 *
 * Ollama is the transport, not the point: it is the least-effort way to put
 * Qwen, Llama and xLAM behind one HTTP call, and it supports structured
 * outputs by passing a JSON Schema as `format`. That is what makes the
 * constrained/unconstrained comparison possible at the small end, which is
 * exactly where it matters — a 1B model that cannot reliably close a brace is
 * a different problem from one that picks the wrong column.
 *
 * `seed: 0` and `temperature: 0` are set so a re-run reproduces. That is a
 * property of the backend, not a guarantee of this harness, and the result
 * file records the settings either way.
 */

const HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

function build(modelId, id) {
  return {
    id: id ?? `ollama:${modelId}`,
    provider: "ollama",
    modelId,
    supportsConstrained: true,

    async unavailable() {
      try {
        const response = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(2000) });
        if (!response.ok) return `Ollama answered ${response.status} at ${HOST}.`;
        const { models = [] } = await response.json();
        const names = models.map((entry) => entry.name);
        if (!names.some((name) => name === modelId || name.startsWith(`${modelId}:`))) {
          return `Ollama at ${HOST} does not have "${modelId}". Run: ollama pull ${modelId}`;
        }
        return null;
      } catch {
        return `No Ollama at ${HOST}. Start it, or set OLLAMA_HOST.`;
      }
    },

    async complete({ system, user, schema, decoding, temperature = 0, maxTokens = 1024, signal }) {
      const started = process.hrtime.bigint();
      const response = await fetch(`${HOST}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          stream: false,
          ...(decoding === "constrained" ? { format: schema } : {}),
          options: { temperature, seed: 0, num_predict: maxTokens },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        ...(signal ? { signal } : {}),
      });

      if (!response.ok) {
        throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 400)}`);
      }

      const body = await response.json();
      return {
        text: body.message?.content ?? "",
        latencyMs: Number(process.hrtime.bigint() - started) / 1e6,
        usage: {
          inputTokens: body.prompt_eval_count,
          outputTokens: body.eval_count,
        },
      };
    },
  };
}

module.exports = { ...build("qwen2.5-coder:3b"), withModel: build };
