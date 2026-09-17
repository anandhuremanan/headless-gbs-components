import { abortError, isRetryable, UploadHttpError } from "./transport";
import type {
  FileRejection,
  Transport,
  UploaderSnapshot,
  UploadItem,
  UploadStatus,
} from "./types";
import { partitionFiles, type ValidationRules } from "./validate";

/** 5 MiB: small enough to retry cheaply, large enough to keep request overhead low. */
export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
export const DEFAULT_CONCURRENCY = 3;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_RETRY_DELAY = 1000;

export interface UploaderConfig extends ValidationRules {
  /** Sends the chunks. Without one, files can be selected but not uploaded. */
  transport?: Transport;
  /** Bytes per request. Default 5 MiB. */
  chunkSize?: number;
  /** Files uploading at the same time. Chunks of one file go one after another. Default 3. */
  concurrency?: number;
  /** Extra attempts per chunk after a retryable failure. Default 3. */
  retries?: number;
  /** First retry delay in ms; doubles on each attempt. Default 1000. */
  retryDelay?: number;
  /** Start uploading as soon as files are added. */
  autoUpload?: boolean;
  /** The selected files changed (added, removed, cleared). */
  onChange?(files: File[]): void;
  onRejected?(rejections: FileRejection[]): void;
  onFileSuccess?(item: UploadItem): void;
  onFileError?(item: UploadItem, error: unknown): void;
  /** Every file started by one `upload()` call has finished, failed, paused or been canceled. */
  onComplete?(items: UploadItem[]): void;
}

export interface AddResult {
  accepted: UploadItem[];
  rejected: FileRejection[];
}

export interface UploaderStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): UploaderSnapshot;
  getServerSnapshot(): UploaderSnapshot;
  addFiles(files: Iterable<File> | ArrayLike<File>): AddResult;
  remove(id: string): void;
  clear(): void;
  /**
   * Starts (or resumes, or retries) the given files, or every file that isn't
   * uploaded yet. Resolves once they have all stopped.
   */
  upload(ids?: readonly string[]): Promise<UploadItem[]>;
  /** Stops after aborting the chunk in flight; `upload()` continues from that chunk. */
  pause(id?: string): void;
  /** Stops and forgets progress; `upload()` starts again from the beginning. */
  cancel(id?: string): void;
  dismissRejection(id?: string): void;
  configure(config: UploaderConfig): void;
}

type StopReason = "pause" | "cancel" | "remove";

interface Running {
  controller: AbortController;
  reason?: StopReason;
}

const EMPTY: UploaderSnapshot = { items: [], rejections: [] };
const IN_FLIGHT: ReadonlySet<UploadStatus> = new Set(["queued", "uploading"]);
const STARTABLE: ReadonlySet<UploadStatus> = new Set(["idle", "paused", "error", "canceled"]);
const NO_TRANSPORT = "Set an endpoint or a transport to upload files.";

let sequence = 0;

/** `crypto.randomUUID` exists only on HTTPS and localhost, so plain-HTTP intranet pages fall back. */
export function createUploadId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${(sequence++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
}

export const chunkCount = (size: number, chunkSize: number) =>
  Math.max(1, Math.ceil(size / chunkSize));

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function describeError(error: unknown): string {
  if (error instanceof UploadHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Totals across all items, for an overall progress bar. */
export function summarize(items: readonly UploadItem[]) {
  let totalBytes = 0;
  let uploadedBytes = 0;
  const counts: Record<UploadStatus, number> = {
    idle: 0,
    queued: 0,
    uploading: 0,
    paused: 0,
    success: 0,
    error: 0,
    canceled: 0,
  };
  for (const item of items) {
    totalBytes += item.file.size;
    uploadedBytes += item.uploadedBytes;
    counts[item.status]++;
  }
  return {
    totalBytes,
    uploadedBytes,
    progress: totalBytes > 0 ? uploadedBytes / totalBytes : counts.success > 0 ? 1 : 0,
    counts,
    /** Something is queued or uploading. */
    busy: counts.queued + counts.uploading > 0,
    /** Files `upload()` would start. */
    startable: counts.idle + counts.paused + counts.error + counts.canceled,
  };
}

/**
 * Selection, validation and chunked uploading, with no React. Snapshots are
 * immutable, so the store plugs straight into `useSyncExternalStore`. Progress
 * is published at most once per whole percent per file, so a fast connection
 * doesn't flood the UI with renders.
 */
export function createUploaderStore(initial: UploaderConfig = {}): UploaderStore {
  let config: UploaderConfig = { ...initial };
  let snapshot: UploaderSnapshot = EMPTY;
  let running = 0;
  const listeners = new Set<() => void>();
  const controllers = new Map<string, Running>();
  const waiters: { ids: ReadonlySet<string>; resolve(items: UploadItem[]): void }[] = [];

  const find = (id: string) => snapshot.items.find((item) => item.id === id);
  const selectedFiles = () => snapshot.items.map((item) => item.file);

  function commit(next: UploaderSnapshot) {
    snapshot = next;
    for (let i = waiters.length - 1; i >= 0; i--) {
      const { ids, resolve } = waiters[i];
      const items = snapshot.items.filter((item) => ids.has(item.id));
      if (items.some((item) => IN_FLIGHT.has(item.status))) continue;
      waiters.splice(i, 1);
      resolve(items);
    }
    for (const listener of listeners) listener();
  }

  function patch(id: string, changes: Partial<UploadItem>) {
    if (!find(id)) return;
    commit({
      ...snapshot,
      items: snapshot.items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    });
  }

  /** Aborts the request in flight. Returns false when nothing was running. */
  function stop(id: string, reason: StopReason): boolean {
    const entry = controllers.get(id);
    if (!entry) return false;
    entry.reason = reason;
    entry.controller.abort();
    return true;
  }

  async function withRetries<T>(send: () => Promise<T>, signal: AbortSignal): Promise<T> {
    const retries = Math.max(0, config.retries ?? DEFAULT_RETRIES);
    for (let attempt = 0; ; attempt++) {
      try {
        return await send();
      } catch (error) {
        if (signal.aborted || attempt >= retries || !isRetryable(error)) throw error;
        await sleep((config.retryDelay ?? DEFAULT_RETRY_DELAY) * 2 ** attempt, signal);
      }
    }
  }

  async function run(id: string) {
    const item = find(id);
    if (!item || item.status !== "queued") return;
    const transport = config.transport;
    if (!transport) {
      patch(id, { status: "error", error: NO_TRANSPORT });
      return;
    }

    const entry: Running = { controller: new AbortController() };
    controllers.set(id, entry);
    const { signal } = entry.controller;

    // A resumed upload keeps its original chunk size, so indexes still line up on the server.
    const fresh = item.chunksDone === 0;
    const chunkSize = fresh ? Math.max(1, config.chunkSize ?? DEFAULT_CHUNK_SIZE) : item.chunkSize;
    const total = fresh ? chunkCount(item.file.size, chunkSize) : item.totalChunks;
    const { file, uploadId } = item;
    const ratio = (bytes: number) => (file.size > 0 ? bytes / file.size : 1);
    patch(id, { status: "uploading", chunkSize, totalChunks: total });

    let percent = Math.floor(item.progress * 100);
    const report = (bytes: number) => {
      const next = Math.floor(ratio(bytes) * 100);
      if (signal.aborted || next === percent) return;
      percent = next;
      patch(id, { uploadedBytes: bytes, progress: ratio(bytes) });
    };

    try {
      for (let index = item.chunksDone; index < total; index++) {
        const offset = index * chunkSize;
        const end = Math.min(file.size, offset + chunkSize);
        const chunk = file.slice(offset, end);
        const response = await withRetries(
          () =>
            transport({
              file,
              chunk,
              index,
              total,
              offset,
              uploadId,
              signal,
              onProgress: (loaded) => report(offset + Math.min(loaded, chunk.size)),
            }),
          signal,
        );
        percent = Math.floor(ratio(end) * 100);
        patch(id, { chunksDone: index + 1, uploadedBytes: end, progress: ratio(end), response });
      }
      patch(id, { status: "success", uploadedBytes: file.size, progress: 1 });
      const done = find(id);
      if (done) config.onFileSuccess?.(done);
    } catch (error) {
      const current = find(id);
      if (!current || entry.reason === "remove") return;
      const confirmed = Math.min(file.size, current.chunksDone * chunkSize);

      if (entry.reason === "pause") {
        patch(id, { status: "paused", uploadedBytes: confirmed, progress: ratio(confirmed) });
      } else if (entry.reason === "cancel") {
        patch(id, { status: "canceled", uploadedBytes: 0, progress: 0, chunksDone: 0 });
      } else {
        patch(id, {
          status: "error",
          error: describeError(error),
          uploadedBytes: confirmed,
          progress: ratio(confirmed),
        });
        const failed = find(id);
        if (failed) config.onFileError?.(failed, error);
      }
    } finally {
      if (controllers.get(id) === entry) controllers.delete(id);
    }
  }

  function pump() {
    const limit = Math.max(1, config.concurrency ?? DEFAULT_CONCURRENCY);
    while (running < limit) {
      const next = snapshot.items.find((item) => item.status === "queued");
      if (!next) return;
      running++;
      // `run` marks the item as uploading before its first await, so the loop moves on.
      void run(next.id).finally(() => {
        running--;
        pump();
      });
    }
  }

  function upload(ids?: readonly string[]): Promise<UploadItem[]> {
    const wanted = ids ? new Set(ids) : undefined;
    const tracked = snapshot.items.filter(
      (item) =>
        (!wanted || wanted.has(item.id)) &&
        (STARTABLE.has(item.status) || IN_FLIGHT.has(item.status)),
    );
    const starting = new Set(
      tracked.filter((item) => STARTABLE.has(item.status)).map((item) => item.id),
    );
    if (tracked.length === 0) return Promise.resolve([]);

    const done = new Promise<UploadItem[]>((resolve) =>
      waiters.push({ ids: new Set(tracked.map((item) => item.id)), resolve }),
    );

    const hasTransport = config.transport !== undefined;
    commit({
      ...snapshot,
      items: snapshot.items.map((item): UploadItem => {
        if (!starting.has(item.id)) return item;
        if (!hasTransport) return { ...item, status: "error", error: NO_TRANSPORT };
        return item.status === "canceled"
          ? {
              ...item,
              status: "queued",
              error: undefined,
              uploadId: createUploadId(),
              uploadedBytes: 0,
              progress: 0,
              chunksDone: 0,
            }
          : { ...item, status: "queued", error: undefined };
      }),
    });
    pump();

    if (starting.size > 0) void done.then((items) => config.onComplete?.(items));
    return done;
  }

  function addFiles(input: Iterable<File> | ArrayLike<File>): AddResult {
    const current = snapshot.items;
    const { accepted, rejected } = partitionFiles(
      Array.from(input),
      current.map((item) => item.file),
      config,
    );
    const chunkSize = Math.max(1, config.chunkSize ?? DEFAULT_CHUNK_SIZE);
    const added: UploadItem[] = accepted.map((file) => ({
      id: createUploadId(),
      uploadId: createUploadId(),
      file,
      status: "idle",
      uploadedBytes: 0,
      progress: 0,
      chunkSize,
      chunksDone: 0,
      totalChunks: chunkCount(file.size, chunkSize),
    }));
    const rejections: FileRejection[] = rejected.map((entry) => ({
      ...entry,
      id: createUploadId(),
    }));
    if (added.length === 0 && rejections.length === 0) return { accepted: [], rejected: [] };

    const replace = !(config.multiple ?? false) && added.length > 0;
    if (replace) for (const item of current) stop(item.id, "remove");

    commit({ items: replace ? added : [...current, ...added], rejections });
    if (added.length > 0) config.onChange?.(selectedFiles());
    if (rejections.length > 0) config.onRejected?.(rejections);
    if (added.length > 0 && config.autoUpload && config.transport) {
      void upload(added.map((item) => item.id));
    }
    return { accepted: added, rejected: rejections };
  }

  function remove(id: string) {
    if (!find(id)) return;
    stop(id, "remove");
    commit({ ...snapshot, items: snapshot.items.filter((item) => item.id !== id) });
    config.onChange?.(selectedFiles());
  }

  function clear() {
    if (snapshot.items.length === 0 && snapshot.rejections.length === 0) return;
    const hadItems = snapshot.items.length > 0;
    for (const item of snapshot.items) stop(item.id, "remove");
    commit(EMPTY);
    if (hadItems) config.onChange?.([]);
  }

  function pause(id?: string) {
    for (const item of snapshot.items) {
      if ((id !== undefined && item.id !== id) || !IN_FLIGHT.has(item.status)) continue;
      if (!stop(item.id, "pause")) patch(item.id, { status: "paused" });
    }
  }

  function cancel(id?: string) {
    for (const item of snapshot.items) {
      if (id !== undefined && item.id !== id) continue;
      if (item.status === "idle" || item.status === "success" || item.status === "canceled") {
        continue;
      }
      if (!stop(item.id, "cancel")) {
        patch(item.id, { status: "canceled", uploadedBytes: 0, progress: 0, chunksDone: 0 });
      }
    }
  }

  function dismissRejection(id?: string) {
    const rejections =
      id === undefined ? [] : snapshot.rejections.filter((rejection) => rejection.id !== id);
    if (rejections.length !== snapshot.rejections.length) commit({ ...snapshot, rejections });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY,
    addFiles,
    remove,
    clear,
    upload,
    pause,
    cancel,
    dismissRejection,
    configure(next) {
      config = { ...config, ...next };
      pump();
    },
  };
}
