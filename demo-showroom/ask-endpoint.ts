import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, ViteDevServer, PreviewServer } from "vite";

/*
 * The demo's model endpoint — the showroom's own backend, not the library's.
 *
 * This is the shape the architecture expects a real application to have. The
 * API key stays on the server and never reaches the bundle, which is why the
 * browser adapter posts here instead of calling a provider directly. Putting a
 * model key in client JavaScript would publish it to every visitor.
 *
 * The server is deliberately dumb: it receives an already-built prompt and
 * forwards it. It knows nothing about grids, intents or validation — the
 * browser built the prompt from the live contract, and the validator in the
 * browser decides what happens to the answer.
 *
 * Dev and preview only. A deployed static build has no endpoint, so the
 * provider resolves to null and the grid renders without the ask box.
 */

const require_ = createRequire(import.meta.url);

/** Mirrors the evaluation harness: Gemini through its OpenAI-compatible API. */
const BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const MODEL = process.env.GBS_ASK_MODEL ?? "gemini-3.5-flash-lite";

interface AskBody {
  utterance: string;
  contract: unknown;
  responseSchema: unknown;
}

/*
 * The harness's own prompt builder and operation definitions, loaded here
 * rather than in the browser. `prompt.cjs` is CommonJS and the operations are
 * TypeScript; Node reads both directly through the same on-demand transpiler
 * the evaluation CLI uses, so the demo asks with the exact prompt the 231-case
 * measurements were made with. A second prompt would make the demo's quality
 * unrelated to anything measured.
 */
let buildPrompt: ((input: Record<string, unknown>) => { system: string; user: string }) | null = null;
let operations: unknown = null;

function promptTools() {
  if (!buildPrompt) {
    const root = fileURLToPath(new URL("..", import.meta.url));
    require_(`${root}tools/ts-require.cjs`).register();
    buildPrompt = require_(`${root}tools/eval/grid/prompt.cjs`).buildPrompt;
    operations = require_(`${root}source/beta-components/data-grid/agent/index.ts`).GRID_OPERATIONS;
  }
  return { buildPrompt: buildPrompt!, operations };
}

function readKey(): string | null {
  try {
    // Reads the repo-root .env without overriding real environment variables.
    require_("../tools/env.cjs").load(fileURLToPath(new URL("..", import.meta.url)));
  } catch {
    /* No .env is fine; the variable may already be set. */
  }
  return process.env.GOOGLE_API_KEY ?? null;
}

const readJson = (request: Connect.IncomingMessage) =>
  new Promise<AskBody>((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      // A prompt is a few thousand characters; anything larger is not ours.
      if (body.length > 1_000_000) reject(new Error("payload too large"));
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body) as AskBody);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

const middleware: Connect.NextHandleFunction = async (request, response, next) => {
  if (!request.url?.startsWith("/api/ask")) return next();

  const send = (status: number, payload: unknown) => {
    response.statusCode = status;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(payload));
  };

  if (request.method === "GET") {
    // The browser asks whether the feature is available before offering it.
    return send(200, { available: readKey() !== null, model: MODEL });
  }
  if (request.method !== "POST") return send(405, { error: "POST or GET" });

  const key = readKey();
  if (!key) {
    return send(503, {
      error:
        "No GOOGLE_API_KEY. Put one in the repo-root .env to enable the ask box; " +
        "the grid works without it.",
    });
  }

  try {
    const { utterance, contract, responseSchema } = await readJson(request);
    if (typeof utterance !== "string" || !contract) {
      return send(400, { error: "expected { utterance, contract, responseSchema }" });
    }

    const tools = promptTools();
    const { system, user } = tools.buildPrompt({
      contract,
      responseSchema,
      operations: tools.operations,
      utterance,
      /*
       * v1, and unconstrained, because that is the configuration the 231-case
       * run measured at 87% for this model. v1 carries the response schema in
       * the prompt itself; Gemini rejects the generated schema as a strict
       * `response_format` (31 `oneOf` branches), so constraining it here would
       * be both broken and unmeasured.
       */
      version: "v1",
    });

    const upstream = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 4096,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        // Ask for an object, not a schema: see the note on the prompt version.
        response_format: { type: "json_object" },
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return send(upstream.status, { error: `${MODEL}: ${text.slice(0, 400)}` });
    }

    const payload = JSON.parse(text) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
    };
    const choice = payload.choices?.[0];
    if (choice?.finish_reason === "length") {
      return send(502, { error: "The model ran out of tokens before finishing." });
    }
    // Hand back the raw string. Parsing and validation belong to the browser,
    // which owns the contract this answer is held to.
    return send(200, { content: choice?.message?.content ?? "" });
  } catch (error) {
    return send(500, { error: error instanceof Error ? error.message : String(error) });
  }
};

export function askEndpoint(): Plugin {
  return {
    name: "gbs-ask-endpoint",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(middleware);
    },
  };
}
