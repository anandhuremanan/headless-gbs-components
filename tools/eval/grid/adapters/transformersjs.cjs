/*
 * The intended destination: a small model running locally, no server.
 *
 * This is the one adapter whose weights are the same bytes the browser will
 * eventually download, and whose runtime is the same ONNX graph. Node gets a
 * native CPU backend instead of WebGPU, so *latency here is not browser
 * latency* — but accuracy is, because it is the same model, the same
 * tokenizer and the same chat template.
 *
 * It is an adapter and nothing more. It receives the prompt the shared builder
 * produced, and it returns raw text. No JSON repair, no retries, no
 * model-specific coaxing, no second attempt with a nudge. If a 0.5B model
 * cannot answer this prompt, the honest outcome is that it cannot, and the
 * validator and scorer are what say so.
 *
 * Model: onnx-community/Qwen2.5-0.5B-Instruct, dtype q4f16.
 *
 *   - It is the smallest officially `transformers.js`-tagged instruct model
 *     with a q4f16 build, which is the dtype the browser path wants.
 *   - 460 MB for the weights — the smallest of the realistic candidates, and
 *     q4f16 is smaller here than q4 (750 MB) or int8 (488 MB).
 *   - Being smallest makes it the fastest honest feasibility check. It is not
 *     the accuracy candidate; Qwen2.5-Coder-1.5B (1.3 GB) is, and the point of
 *     proving the pipeline on the small one first is to not spend an hour
 *     downloading before learning the plumbing works.
 *
 * Note on xLAM-2-1b-fc-r, which was the preferred candidate on paper: it is
 * published as GGUF and CTranslate2 only. There is no ONNX build, so it cannot
 * run under Transformers.js and therefore cannot run in a browser at all. It
 * is an Ollama-only option, which contradicts the no-server requirement.
 */

const path = require("path");
const os = require("os");

const DEFAULT_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const DEFAULT_DTYPE = "q4f16";

/*
 * Weights live outside the repository. They are hundreds of megabytes and
 * belong to the machine, not to the project.
 */
const CACHE_DIR =
  process.env.GRAMPROKIT_MODEL_CACHE || path.join(os.homedir(), ".cache", "gramprokit-models");

/** Loaded once per process: a second case must not pay the load again. */
const loaded = new Map();

async function getGenerator(modelId, dtype) {
  const key = `${modelId}@${dtype}`;
  if (loaded.has(key)) return loaded.get(key);

  const promise = (async () => {
    // ESM-only package, required from CommonJS.
    const transformers = await import("@huggingface/transformers");
    const { pipeline, env } = transformers;

    env.cacheDir = CACHE_DIR;
    env.allowLocalModels = false;

    const started = process.hrtime.bigint();
    const generator = await pipeline("text-generation", modelId, {
      dtype,
      device: process.env.GRAMPROKIT_DEVICE || "cpu",
    });
    const loadMs = Number(process.hrtime.bigint() - started) / 1e6;

    return { generator, loadMs, backend: process.env.GRAMPROKIT_DEVICE || "cpu" };
  })();

  loaded.set(key, promise);
  return promise;
}

function build(modelId, id, dtype = DEFAULT_DTYPE) {
  const model = modelId ?? DEFAULT_MODEL;

  return {
    id: id ?? `transformersjs:${model}`,
    provider: "transformersjs",
    modelId: model,
    dtype,
    cacheDir: CACHE_DIR,
    /*
     * Constrained decoding is available for this runtime through
     * `@huggingface/transformers-structured-output`, a LogitsProcessorList
     * that masks any token breaking a JSON Schema. It is not wired up yet, and
     * claiming it before it is would put a false `decodingMode` in a result
     * file. Unconstrained until it is installed and measured.
     */
    supportsConstrained: false,

    async unavailable() {
      try {
        await import("@huggingface/transformers");
      } catch {
        return (
          "@huggingface/transformers is not installed. Run: " +
          "npm install --save-dev @huggingface/transformers"
        );
      }
      return null;
    },

    async complete({ system, user, temperature = 0, maxTokens = 512 }) {
      const { generator, loadMs, backend } = await getGenerator(model, dtype);

      const messages = [
        { role: "system", content: system },
        { role: "user", content: user },
      ];

      const started = process.hrtime.bigint();
      const output = await generator(messages, {
        max_new_tokens: maxTokens,
        // Greedy. A benchmark that samples is a benchmark you cannot re-run.
        do_sample: temperature > 0,
        ...(temperature > 0 ? { temperature } : {}),
        return_full_text: false,
      });
      const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;

      /*
       * The pipeline returns the assistant turn. Taking `.content` is reading
       * the response, not repairing it — no trimming of prose, no brace
       * hunting, no stripping of a fence. Whatever the model wrote goes
       * through to the validator exactly as written.
       */
      const first = Array.isArray(output) ? output[0] : output;
      const generated = first?.generated_text;
      const text =
        typeof generated === "string"
          ? generated
          : Array.isArray(generated)
            ? (generated.at(-1)?.content ?? "")
            : "";

      let inputTokens;
      let outputTokens;
      try {
        /*
         * `tokenize: true` hands back a tensor-shaped object rather than an
         * array, so the template is rendered to a string and encoded instead.
         * `encode` returns a plain array, which is what we want to count.
         */
        const rendered = generator.tokenizer.apply_chat_template(messages, {
          add_generation_prompt: true,
          tokenize: false,
        });
        inputTokens = generator.tokenizer.encode(rendered).length;
        outputTokens = generator.tokenizer.encode(text).length;
      } catch {
        /* Counts are instrumentation; their absence is not a failure. */
      }

      return {
        text,
        latencyMs,
        loadMs,
        backend,
        ...(inputTokens !== undefined ? { usage: { inputTokens, outputTokens } } : {}),
      };
    },
  };
}

module.exports = { ...build(), withModel: build, DEFAULT_MODEL, DEFAULT_DTYPE, CACHE_DIR };
