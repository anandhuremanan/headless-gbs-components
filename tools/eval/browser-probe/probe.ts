/*
 * Browser WebGPU latency probe — is Qwen2.5-0.5B worth continuing with?
 *
 * Not an accuracy benchmark. One case, grid-001, with the byte-identical
 * grid-intent-v2 prompt frozen by prepare.cjs. The question is seconds.
 *
 * The first version of this probe produced a confident "NOT VIABLE" from a
 * broken instrument: it timed the generation of four tokens, captured the user
 * prompt as the model's answer, could not say whether WebGPU or WASM had run,
 * and measured 6 MB of application bundles while 460 MB of weights went past
 * invisibly. So this version checks itself first, and refuses to conclude
 * anything when a sanity check fails.
 *
 * Deliberately absent: JSON repair, retries, brace extraction, semantic
 * correction, any fallback model or backend.
 */

import { env, AutoTokenizer, AutoModelForCausalLM, TextStreamer } from "@huggingface/transformers";
import { mountInBrowser, type Fixture } from "./mount";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const DTYPE = "q4f16";
const WARM_RUNS = 3;
const MAX_NEW_TOKENS = 256;

const el = (id: string) => document.getElementById(id)!;
const say = (line: string) => {
  el("log").textContent += `${line}\n`;
  el("log").scrollTop = el("log").scrollHeight;
};
const ms = (n: number) => `${Math.round(n).toLocaleString()} ms`;
const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

interface Run {
  label: string;
  totalMs: number;
  ttftMs: number | null;
  generatedTokens: number;
  decodedChars: number;
}

/* ------------------------------------------------------------------ WebGPU */

async function inspectAdapter() {
  const out: Record<string, unknown> = {
    secureContext: window.isSecureContext,
    navigatorGpu: "gpu" in navigator,
  };
  if (!navigator.gpu) return out;

  const adapter = await navigator.gpu.requestAdapter();
  out.adapterFound = Boolean(adapter);
  if (!adapter) return out;

  const info = adapter.info ?? ({} as GPUAdapterInfo);
  Object.assign(out, {
    vendor: info.vendor,
    architecture: info.architecture,
    device: info.device || null,
    description: info.description || null,
    isFallbackAdapter: (adapter as { isFallbackAdapter?: boolean }).isFallbackAdapter ?? false,
    maxBufferSize: adapter.limits?.maxBufferSize,
  });
  try {
    out.deviceCreated = Boolean(await adapter.requestDevice());
  } catch (error) {
    out.deviceCreated = false;
    out.deviceError = String((error as Error).message);
  }
  return out;
}

/**
 * Did WebGPU actually run the inference?
 *
 * Not read from a private field. `env.backends.onnx` is the onnxruntime-web
 * namespace Transformers.js exposes, and `ort.env.webgpu.device` is populated
 * by the runtime only once a WebGPU session has been created. A null there
 * after a successful generation means something else did the work.
 */
function backendEvidence() {
  const ort = (env as { backends?: { onnx?: Record<string, unknown> } }).backends?.onnx;
  const ortEnv = ort?.env as
    | { webgpu?: { device?: unknown; adapter?: unknown }; wasm?: { numThreads?: number } }
    | undefined;

  const webgpuDevice = ortEnv?.webgpu?.device ?? null;
  return {
    ortWebgpuDeviceCreated: Boolean(webgpuDevice),
    ortWebgpuAdapterPresent: Boolean(ortEnv?.webgpu?.adapter),
    ortWasmThreads: ortEnv?.wasm?.numThreads ?? null,
    /* The only claim this function will make. */
    confirmed: Boolean(webgpuDevice) ? "webgpu" : "unconfirmed",
  };
}

/* ------------------------------------------------------- download tracking */

interface FileProgress {
  file: string;
  bytes: number;
  cached: boolean;
}

function createDownloadTracker() {
  const files = new Map<string, { bytes: number; sawProgress: boolean }>();

  const onProgress = (p: {
    status?: string;
    file?: string;
    total?: number;
    loaded?: number;
    progress?: number;
  }) => {
    if (!p.file) return;
    const entry = files.get(p.file) ?? { bytes: 0, sawProgress: false };
    if (p.status === "progress") {
      entry.sawProgress = true;
      entry.bytes = Math.max(entry.bytes, p.loaded ?? 0);
      el("progress").textContent = `${p.file} ${Math.round(p.progress ?? 0)}%`;
    }
    if (p.status === "done") entry.bytes = Math.max(entry.bytes, p.total ?? entry.bytes);
    files.set(p.file, entry);
  };

  const report = () => {
    const perFile: FileProgress[] = [...files].map(([file, v]) => ({
      file,
      bytes: v.bytes,
      /* No progress events means the bytes never crossed the network. */
      cached: !v.sawProgress,
    }));
    const downloaded = perFile.filter((f) => !f.cached);
    return {
      fileCount: perFile.length,
      downloadedFileCount: downloaded.length,
      downloadedBytes: downloaded.reduce((s, f) => s + f.bytes, 0),
      totalBytes: perFile.reduce((s, f) => s + f.bytes, 0),
      perFile: perFile.sort((a, b) => b.bytes - a.bytes),
      cacheHit: downloaded.length === 0 && perFile.length > 0,
    };
  };

  return { onProgress, report };
}

/* -------------------------------------------------------------------- main */

async function main() {
  const params = new URLSearchParams(location.search);
  const visit = Number(params.get("visit") ?? "1");
  /*
   * The browser produced a five-token echo of the question where Node, same
   * model and same prompt, produced 109 tokens of JSON. The only difference is
   * the backend, so the backend has to become a variable.
   */
  const device = (params.get("device") ?? "webgpu") as "webgpu" | "wasm";
  const result: Record<string, unknown> = {
    probe: "browser-webgpu-latency",
    probeVersion: 2,
    visit,
    startedAt: new Date().toISOString(),
  };

  const payload = (await (await fetch("./prompt.json")).json()) as {
    corpusVersion: string;
    promptVersion: string;
    contractVersion: string;
    case: { id: string; utterance: string; expected: unknown[] };
    system: string;
    user: string;
    fixture: Fixture;
  };

  Object.assign(result, {
    visit,
    corpusVersion: payload.corpusVersion,
    promptVersion: payload.promptVersion,
    contractVersion: payload.contractVersion,
    case: payload.case.id,
    utterance: payload.case.utterance,
    expected: payload.case.expected,
    promptChars: payload.system.length + payload.user.length,
    modelId: MODEL,
    dtype: DTYPE,
    requestedDevice: device,
    transformersJsVersion: (env as { version?: string }).version ?? "unknown",
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    pageLoadMs: Math.round(
      (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)?.duration ?? 0,
    ),
  });

  say(`visit ${visit} · device=${device}  ·  ${payload.case.id} — ${JSON.stringify(payload.case.utterance)}`);
  say(`prompt ${payload.promptVersion} (${payload.system.length} chars)  ·  corpus ${payload.corpusVersion}`);
  say(`page load ${result.pageLoadMs} ms`);
  say("");

  const adapter = await inspectAdapter();
  result.webgpuAdapter = adapter;
  say(`WebGPU adapter  ${adapter.vendor ?? "?"} / ${adapter.architecture ?? "?"}  fallback=${adapter.isFallbackAdapter}  device=${adapter.deviceCreated}`);

  if (device === "webgpu" && (!adapter.navigatorGpu || !adapter.adapterFound || !adapter.deviceCreated)) {
    result.status = "no-webgpu";
    say("ABORT: WebGPU unavailable — a timing from here would be a WASM timing.");
    return finish(result);
  }

  /* ------------------------------------------------------------ load model */
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  const tracker = createDownloadTracker();
  say("");
  say("loading tokenizer + model …");

  const loadStart = performance.now();
  let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
  let model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>;
  try {
    tokenizer = await AutoTokenizer.from_pretrained(MODEL, { progress_callback: tracker.onProgress });
    model = await AutoModelForCausalLM.from_pretrained(MODEL, {
      dtype: DTYPE,
      device,
      progress_callback: tracker.onProgress,
    });
  } catch (error) {
    result.status = "load-failed";
    result.error = String((error as Error).message);
    say(`ABORT: load failed — ${result.error}`);
    return finish(result);
  }
  const modelLoadMs = performance.now() - loadStart;
  el("progress").textContent = "";

  result.modelLoadMs = Math.round(modelLoadMs);
  result.download = tracker.report();
  const dl = result.download as ReturnType<typeof tracker.report>;

  say(`model loaded    ${ms(modelLoadMs)}`);
  say(`files           ${dl.fileCount} total, ${dl.downloadedFileCount} fetched over the network`);
  say(`weights         ${mb(dl.downloadedBytes)} downloaded / ${mb(dl.totalBytes)} total`);
  say(`cache           ${dl.cacheHit ? "HIT — nothing re-downloaded" : "MISS — bytes crossed the network"}`);

  /* ------------------------------------------------------ one generation */
  const messages = [
    { role: "system", content: payload.system },
    { role: "user", content: payload.user },
  ];

  const inputs = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  }) as { input_ids: { dims: number[] } };
  const promptTokens = inputs.input_ids.dims.at(-1) as number;
  result.promptTokens = promptTokens;
  say(`prompt tokens   ${promptTokens}`);
  say("");

  const runOnce = async (label: string): Promise<{ run: Run; text: string }> => {
    let ttftMs: number | null = null;
    let callbacks = 0;
    const start = performance.now();

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: () => {
        callbacks += 1;
        if (ttftMs === null) ttftMs = performance.now() - start;
      },
    });

    /*
     * `model.generate`, not the pipeline. The pipeline's messages return shape
     * gave back the *user* turn when generation was short, which is how the
     * first probe came to report the prompt as the model's answer.
     */
    const output = (await model.generate({
      ...(inputs as object),
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
      streamer,
    })) as { slice: (a: null, b: [number, null]) => unknown; dims: number[] };
    const totalMs = performance.now() - start;

    const continuation = output.slice(null, [promptTokens, null]);
    const text = (tokenizer.batch_decode(continuation as never, { skip_special_tokens: true })[0] ?? "");
    const generatedTokens = (output.dims.at(-1) as number) - promptTokens;

    say(
      `${label.padEnd(16)}${ms(totalMs)}  TTFT ${ttftMs === null ? "n/a" : ms(ttftMs)}  ` +
        `${generatedTokens} tokens (${callbacks} stream events), ${text.length} chars`,
    );
    return { run: { label, totalMs, ttftMs, generatedTokens, decodedChars: text.length }, text };
  };

  const cold = await runOnce("first inference");
  result.firstInference = cold.run;
  result.rawOutput = cold.text;

  const warm: Run[] = [];
  for (let i = 1; i <= WARM_RUNS; i++) warm.push((await runOnce(`warm ${i}`)).run);
  result.warmRuns = warm;

  const times = warm.map((w) => w.totalMs).sort((a, b) => a - b);
  const pct = (p: number) => Math.round(times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))]);
  result.warmP50 = pct(50);
  result.warmP95 = pct(95);
  const ttfts = warm.map((w) => w.ttftMs).filter((n): n is number => n !== null).sort((a, b) => a - b);
  result.warmTtftP50 = ttfts.length ? Math.round(ttfts[Math.floor(ttfts.length / 2)]) : null;

  say("");
  say(`warm p50        ${ms(result.warmP50 as number)}   TTFT p50 ${result.warmTtftP50 === null ? "n/a" : ms(result.warmTtftP50 as number)}`);

  /* ------------------------------------------------- sanity-check the probe */
  const checks = {
    outputNotTheUserPrompt: cold.text.trim() !== payload.user.trim() && cold.text.trim() !== payload.case.utterance.trim(),
    outputNonTrivial: cold.run.generatedTokens > 10,
    tokenCountAgreesWithText: cold.run.decodedChars > cold.run.generatedTokens,
    backendConfirmed: device === "wasm" ? true : backendEvidence().confirmed === "webgpu",
    downloadMeasured: dl.totalBytes > 100 * 1048576,
  };
  result.backend = backendEvidence();
  result.sanityChecks = checks;
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  result.sanityFailed = failed;

  say("");
  for (const [name, ok] of Object.entries(checks)) say(`  ${ok ? "pass" : "FAIL"}  ${name}`);
  say(`backend         ${result.backend && (result.backend as { confirmed: string }).confirmed}`);

  /* --------------------------------------------------- the real validator */
  const agent = mountInBrowser(payload.fixture);
  const trimmed = cold.text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  let parsed: unknown = trimmed;
  let parsedAsJson = false;
  try {
    parsed = JSON.parse(fenced ? fenced[1] : trimmed);
    parsedAsJson = true;
  } catch {
    /* Left as the raw string; the validator will refuse it. */
  }
  const verdict = agent.respond(parsed);
  result.parsedAsJson = parsedAsJson;
  result.validator = {
    status: verdict.status,
    code: (verdict as { code?: string }).code ?? null,
    reason: (verdict as { reason?: string }).reason ?? null,
  };
  say("");
  say(`validator       ${verdict.status}${(verdict as { code?: string }).code ? ` (${(verdict as { code?: string }).code})` : ""}`);

  /* ------------------------------------------------------------ conclusion */
  if (failed.length > 0) {
    result.status = "instrument-unreliable";
    result.conclusion = `no verdict — failed sanity checks: ${failed.join(", ")}`;
    say("");
    say(`NO VERDICT — the instrument failed: ${failed.join(", ")}`);
    return finish(result);
  }

  const p50 = result.warmP50 as number;
  result.status = "complete";
  result.conclusion = p50 < 2000 ? "viable" : p50 < 6000 ? "borderline" : "not viable";
  say("");
  say(`CONCLUSION      ${String(result.conclusion).toUpperCase()}  (warm p50 ${ms(p50)})`);
  return finish(result);
}

function finish(result: Record<string, unknown>) {
  el("raw").textContent = String(result.rawOutput ?? "(none)");
  el("json").textContent = JSON.stringify(result, null, 2);
  (window as unknown as { PROBE_RESULT: unknown }).PROBE_RESULT = result;
  el("status").textContent = `done: ${result.status}`;
  document.title = `probe: ${result.status}`;
}

main().catch((error) => {
  say(`FATAL: ${error.message}`);
  finish({ probe: "browser-webgpu-latency", probeVersion: 2, status: "error", error: String(error.message) });
});
