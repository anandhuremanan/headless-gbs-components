/*
 * One adapter for every provider that speaks the OpenAI chat-completions
 * shape — which, as of 2026, is most of them, including the free ones.
 *
 * This exists because the ceiling tier is a *diagnostic*, not a production
 * candidate. Its only job is to answer "can a capable reader follow this
 * prompt?", and a free 70B-class model answers that as well as a paid
 * frontier one. Making the ceiling cost money would have meant it never got
 * run, and an unrun ceiling makes every small-model number uninterpretable.
 *
 * Free tiers throttle hard, so two things are handled here rather than left
 * to whoever runs it at 2am: a 429 is retried with backoff and the
 * provider's own `retry-after` is honoured, and the runner can space requests
 * with `--rpm`.
 *
 * Model ids are not baked in beyond a starting default. They change, free
 * tiers come and go, and a benchmark that silently used a different model
 * than the one named in its result file would be worse than useless — so the
 * id actually sent is what gets recorded.
 */

const PROVIDERS = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    env: "OPENAI_API_KEY",
    defaultModel: "gpt-5.1",
    /* `response_format: json_schema` with `strict: true`. */
    constrained: "json_schema",
    note: "paid",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    env: "GOOGLE_API_KEY",
    defaultModel: "gemini-3-flash",
    constrained: "json_schema",
    note: "free tier, no card: the roomiest option for a full 230-case run",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    env: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
    constrained: "json_schema",
    note: "free tier, no card; the tokens-per-minute cap is the binding limit here",
  },
  huggingface: {
    baseUrl: "https://router.huggingface.co/v1",
    env: "HF_TOKEN",
    defaultModel: "Qwen/Qwen2.5-72B-Instruct",
    constrained: false,
    note: "free monthly credits are small; good for a slice, thin for a full run",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    env: "OPENROUTER_API_KEY",
    defaultModel: "deepseek/deepseek-chat-v3:free",
    constrained: false,
    note: "free models are capped per day until the account has bought credits",
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Honour the provider's own advice when it gives any; otherwise back off. */
function retryDelay(response, attempt) {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.min(60_000, seconds * 1000);
  }
  return Math.min(30_000, 1000 * 2 ** attempt);
}

function build(providerName, modelId, id) {
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown provider "${providerName}"`);
  const model = modelId ?? provider.defaultModel;

  return {
    id: id ?? `${providerName}:${model}`,
    provider: providerName,
    modelId: model,
    baseUrl: provider.baseUrl,
    supportsConstrained: provider.constrained !== false,
    note: provider.note,

    unavailable() {
      return process.env[provider.env]
        ? null
        : `${provider.env} is not set. Get a key (${providerName}), export it, or run a tier ` +
            "that needs no credentials (`--model=baseline`).";
    },

    async complete({ system, user, schema, decoding, temperature = 0, maxTokens = 1024, signal }) {
      const body = {
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      };

      if (decoding === "constrained" && provider.constrained === "json_schema") {
        body.response_format = {
          type: "json_schema",
          json_schema: { name: "grid_response", strict: true, schema },
        };
      }

      const started = process.hrtime.bigint();
      let lastError = "";

      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${process.env[provider.env]}`,
          },
          body: JSON.stringify(body),
          ...(signal ? { signal } : {}),
        });

        if (response.status === 429 || response.status >= 500) {
          lastError = `${response.status}: ${(await response.text()).slice(0, 200)}`;
          if (attempt === 4) break;
          await sleep(retryDelay(response, attempt));
          continue;
        }

        if (!response.ok) {
          const detail = (await response.text()).slice(0, 400);
          if (decoding === "constrained" && /schema|response_format/i.test(detail)) {
            throw new Error(
              `${providerName} refused the generated schema in strict mode: ${detail}. ` +
                "Re-run with --unconstrained and report it as such; do not mix the two.",
            );
          }
          throw new Error(`${providerName} ${response.status}: ${detail}`);
        }

        const payload = await response.json();
        return {
          text: payload.choices?.[0]?.message?.content ?? "",
          latencyMs: Number(process.hrtime.bigint() - started) / 1e6,
          usage: payload.usage
            ? { inputTokens: payload.usage.prompt_tokens, outputTokens: payload.usage.completion_tokens }
            : undefined,
        };
      }

      throw new Error(
        `${providerName} kept rate-limiting or failing (${lastError}). ` +
          "Free tiers throttle hard — try `--rpm=8 --concurrency=1`, or a provider with more headroom.",
      );
    },
  };
}

module.exports = { build, PROVIDERS };
