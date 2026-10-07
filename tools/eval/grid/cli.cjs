#!/usr/bin/env node
/*
 * npm run eval:grid -- --model=baseline
 *
 * With no --model it prints the corpus coverage report instead, which is what
 * the command did before models entered the picture and is still the right
 * answer to "what does this corpus contain".
 */

const { run, loadedFromEnvFile } = require("./runner.cjs");
const { renderMarkdown } = require("./metrics.cjs");
const { BENCHMARK_ORDER, PROVIDERS, resolve: resolveAdapter } = require("./adapters/index.cjs");

function parse(argv) {
  const options = { models: [], decoding: null, concurrency: 4 };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (arg === "--all") options.models.push(...BENCHMARK_ORDER);
    else if (key === "model") options.models.push(value);
    else if (arg === "--constrained") options.decoding = "constrained";
    else if (arg === "--unconstrained") options.decoding = "unconstrained";
    else if (key === "concurrency") options.concurrency = Number(value);
    else if (key === "rpm") options.rpm = Number(value);
    else if (key === "prompt") options.promptVersion = value.replace(/^grid-intent-/, "");
    else if (key === "limit") options.limit = Number(value);
    else if (key === "only") options.only = value.split(",");
    else if (arg === "--hard") options.only = ["hard"];
    else if (arg === "--no-write") options.write = false;
    else if (arg === "--list-models") options.listModels = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown flag ${arg}`);
  }
  return options;
}

const HELP = `
Usage: npm run eval:grid -- [--model=<id>] [options]

  --model=<id>      baseline | oracle              no credentials needed
                    ceiling                       the free diagnostic tier
                    gemini | groq | huggingface | openrouter | openai
                    <provider>:<model-id>         any model that provider serves
                    qwen2.5-coder-3b | llama-3.2-3b | xlam-2-1b-fc-r   (Ollama)
                    frontier                      paid; not needed for the ceiling
  --all             every benchmark tier, in decision order
  --constrained     force structured decoding (adapters that support it)
  --unconstrained   force free-form decoding
  --hard            the frozen hard set only
  --only=a,b        case ids or categories
  --limit=N         first N cases
  --concurrency=N   parallel requests (default 4)
  --rpm=N           cap requests per minute, shared across workers
  --prompt=v1|v2    v1 carries the JSON Schema (~4,300 tokens); v2 omits it
                    (~1,800) and relies on constrained decoding for the shape
  --no-write        do not write eval/results/
  --list-models     print the model ids a provider's key actually serves

With no --model, prints the corpus coverage report.

Credentials come from .env at the repository root, or from the environment
(a real environment variable wins). They are never written to a result:
  GOOGLE_API_KEY      --model=ceiling / gemini     free, no card
  GROQ_API_KEY        --model=groq                 free, no card
  HF_TOKEN            --model=huggingface          free credits, small
  OPENROUTER_API_KEY  --model=openrouter           free models, daily cap
  OPENAI_API_KEY      --model=openai               paid
  ANTHROPIC_API_KEY   --model=frontier             paid
  OLLAMA_HOST         local models (default http://localhost:11434)

Free tiers throttle. If you hit 429s, try --rpm=8 --concurrency=1.
`;

async function main() {
  const options = parse(process.argv.slice(2));

  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  if (options.listModels) {
    for (const model of options.models.length > 0 ? options.models : ["ceiling"]) {
      const adapter = resolveAdapter(model);
      if (!adapter.baseUrl) {
        console.log(`${model}: not a hosted provider, so there is no model list.`);
        continue;
      }
      const reason = await adapter.unavailable();
      if (reason) {
        console.log(`${model}: ${reason}`);
        continue;
      }
      const response = await fetch(`${adapter.baseUrl}/models`, {
        headers: { authorization: `Bearer ${process.env[PROVIDERS[adapter.provider].env]}` },
      });
      if (!response.ok) {
        console.log(`${model}: ${response.status} ${(await response.text()).slice(0, 200)}`);
        continue;
      }
      const { data = [] } = await response.json();
      console.log(`
${adapter.provider} (${data.length} models), default \`${adapter.modelId}\`:`);
      for (const entry of data.map((m) => m.id.replace(/^models\//, "")).sort()) {
        console.log(`  ${adapter.provider}:${entry}`);
      }
    }
    return;
  }

  if (options.models.length === 0) {
    require("../report.cjs");
    return;
  }

  // Names only. A key that gets printed is a key that ends up in a log.
  if (loadedFromEnvFile.length > 0) {
    console.log(`Read from .env: ${loadedFromEnvFile.join(", ")}`);
  }

  const failures = [];
  for (const model of options.models) {
    const decoding = options.decoding ?? "unconstrained";
    process.stdout.write(`\n${model} (${decoding})\n`);

    let result;
    try {
      result = await run({
        model,
        decoding,
        concurrency: options.concurrency,
        ...(options.rpm ? { rpm: options.rpm } : {}),
        ...(options.promptVersion ? { promptVersion: options.promptVersion } : {}),
        ...(options.limit ? { limit: options.limit } : {}),
        ...(options.only ? { only: options.only } : {}),
        ...(options.write === false ? { write: false } : {}),
        onProgress: (done, total) => {
          process.stdout.write(`\r  ${done}/${total}`);
          if (done === total) process.stdout.write("\n");
        },
      });
    } catch (error) {
      if (error.code === "PREFLIGHT_FAILED") {
        console.log(`  ${error.message}
`);
        failures.push(model);
        continue;
      }
      if (error.code === "ADAPTER_UNAVAILABLE") {
        console.log(`  skipped — ${error.message}`);
        failures.push(model);
        continue;
      }
      throw error;
    }

    /*
     * A run where every request failed is not a 0% score, it is a broken
     * setup. Printing a report for it would bury "Please pass a valid API key"
     * under a table of zeroes.
     */
    const broken = result.records.filter((record) => record.failure === "adapter_error");
    if (broken.length === result.records.length) {
      console.log(`  every request failed — this is a setup problem, not a score.
`);
      console.log(`  ${broken[0].detail}
`);
      failures.push(model);
      continue;
    }
    if (broken.length > 0) {
      console.log(
        `  warning: ${broken.length} of ${result.records.length} request(s) failed at the provider ` +
          `and are scored as errors. First one:
  ${broken[0].detail}
`,
      );
    }

    console.log(renderMarkdown(result));
    if (!result.meta.benchmark) {
      console.log(
        "> `oracle` is a harness self-test, not a benchmark. Anything below 100% here is a " +
          "harness bug, and every model number collected before it is fixed is meaningless.\n",
      );
    }
  }

  if (failures.length > 0) {
    console.log(`Not run: ${failures.join(", ")}. See --help for the credentials each needs.`);
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
