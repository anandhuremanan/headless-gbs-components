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

/** Compiled grammars, likewise. The schema is constant across a run. */
const constrained = new Map();

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
     * False, deliberately, even though the llguidance wiring below exists.
     *
     * `@huggingface/transformers-structured-output` is a pure-JS port of
     * llguidance: a LogitsProcessorList that masks, at every step, any token
     * which would break the JSON Schema. That is the right mechanism, and the
     * code to attach it is kept below so the next attempt starts from working
     * plumbing rather than from nothing.
     *
     * It does not run. Every attempt fails immediately with "Token 0 does not
     * satisfy the constraint" — before the model emits anything. Two diagnoses
     * (the pipeline dropping `logits_processor`; an incompatible schema) were
     * both disproved by bisection, so the cause is still unknown.
     *
     * A capability flag is a promise to the result file: `decodingMode:
     * "constrained"` in a record has to mean the grammar was enforced. Until
     * one constrained generation completes, declaring it would make every such
     * record a lie. Set this back to `true` in the same commit that shows a
     * passing run.
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

    async complete({ system, user, schema, decoding, temperature = 0, maxTokens = 512 }) {
      const { generator, loadMs, backend } = await getGenerator(model, dtype);

      /*
       * One processor per (tokenizer, schema). Building it compiles the
       * grammar against the vocabulary, which is not free, and the schema is
       * the same for every case in a run.
       */
      let logitsProcessor;
      if (decoding === "constrained") {
        const cacheKey = `${model}@${dtype}`;
        let processor = constrained.get(cacheKey);
        if (!processor) {
          const { StructuredOutputProcessor } = await import(
            "@huggingface/transformers-structured-output"
          );
          StructuredOutputProcessor.warmup(generator.tokenizer);
          processor = new StructuredOutputProcessor(generator.tokenizer, {
            type: "json_schema",
            json_schema: schema,
          });
          constrained.set(cacheKey, processor);
        }
        logitsProcessor = processor;
      }

      const messages = [
        { role: "system", content: system },
        { role: "user", content: user },
      ];

      /*
       * `model.generate`, not the pipeline.
       *
       * The pipeline accepts `logits_processor` and silently drops it: a run
       * that looked constrained produced `"result": "clearFilters"`, which the
       * grammar forbids. A benchmark that reports `decodingMode: constrained`
       * while generating freely is worse than one that cannot constrain at
       * all, so both modes go through the model directly and differ only by
       * whether the processor is attached.
       */
      const inputs = generator.tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
      });

      const started = process.hrtime.bigint();
      const output = await generator.model.generate({
        ...inputs,
        max_new_tokens: maxTokens,
        // Greedy. A benchmark that samples is a benchmark you cannot re-run.
        do_sample: temperature > 0,
        ...(temperature > 0 ? { temperature } : {}),
        ...(logitsProcessor ? { logits_processor: logitsProcessor } : {}),
      });
      const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;

      /*
       * Only the continuation is decoded — the prompt is sliced off by length.
       * That is reading the response, not repairing it: no trimming of prose,
       * no brace hunting, no stripping of a fence. Whatever the model wrote
       * reaches the validator exactly as written.
       */
      const promptLength = inputs.input_ids.dims.at(-1);
      const text = generator.tokenizer.batch_decode(
        output.slice(null, [promptLength, null]),
        { skip_special_tokens: true },
      )[0] ?? "";

      let inputTokens = promptLength;
      let outputTokens;
      try {
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
        constrained: Boolean(logitsProcessor),
      };
    },
  };
}

module.exports = { ...build(), withModel: build, DEFAULT_MODEL, DEFAULT_DTYPE, CACHE_DIR };
