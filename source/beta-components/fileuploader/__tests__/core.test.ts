import { describe, expect, it, vi } from "vitest";
import { fileKind, formatBytes, readFileId } from "../core/format";
import { chunkCount, createUploaderStore, summarize } from "../core/store";
import { buildChunkForm, isRetryable, UploadHttpError } from "../core/transport";
import type { ChunkRequest, Transport } from "../core/types";
import { matchesAccept, partitionFiles } from "../core/validate";

const file = (name: string, size = 10, type = "", lastModified = 1) =>
  new File([new Uint8Array(size)], name, { type, lastModified });

/** Resolves every chunk right away, answering like the Go chunk-uploader. */
function instantTransport(handler?: (request: ChunkRequest) => unknown) {
  const calls: ChunkRequest[] = [];
  const transport: Transport = async (request) => {
    calls.push(request);
    request.onProgress(request.chunk.size);
    if (handler) return handler(request);
    return request.index === request.total - 1
      ? { status: "complete", metadata: { storedName: `${request.uploadId}.bin` } }
      : { status: "chunk_received" };
  };
  return { transport, calls };
}

/** Chunks wait until the test settles them; aborting rejects like a real request. */
function manualTransport() {
  const pending: { request: ChunkRequest; resolve(value: unknown): void }[] = [];
  const transport: Transport = (request) =>
    new Promise((resolve, reject) => {
      pending.push({ request, resolve });
      request.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
  return { transport, pending };
}

describe("validation", () => {
  it("reads accept strings like the browser does", () => {
    const pdf = { name: "Report.PDF", type: "application/pdf" };
    expect(matchesAccept(pdf, ".pdf")).toBe(true);
    expect(matchesAccept(pdf, "image/*, .pdf")).toBe(true);
    expect(matchesAccept(pdf, "application/pdf")).toBe(true);
    expect(matchesAccept(pdf, "image/*")).toBe(false);
    expect(matchesAccept(pdf, "")).toBe(true);
    expect(matchesAccept({ name: "a.png", type: "image/png" }, "image/*")).toBe(true);
  });

  it("keeps only the first valid file in single mode", () => {
    const result = partitionFiles([file("a.txt"), file("b.txt")], [file("old.txt")], {});
    expect(result.accepted.map((f) => f.name)).toEqual(["a.txt"]);
    expect(result.rejected).toEqual([expect.objectContaining({ code: "too-many-files" })]);
  });

  it("counts files already selected against maxFiles", () => {
    const result = partitionFiles([file("b.txt"), file("c.txt")], [file("a.txt")], {
      multiple: true,
      maxFiles: 2,
    });
    expect(result.accepted.map((f) => f.name)).toEqual(["b.txt"]);
    expect(result.rejected[0]).toMatchObject({ code: "too-many-files" });
  });

  it("rejects by type, size, duplicate and custom rule, with a reason each", () => {
    const existing = [file("same.txt", 10)];
    const result = partitionFiles(
      [
        file("photo.png", 10, "image/png"),
        file("big.txt", 500),
        file("tiny.txt", 1),
        file("same.txt", 10),
        file("secret.txt", 10),
        file("ok.txt", 10),
      ],
      existing,
      {
        multiple: true,
        accept: ".txt",
        maxSize: 100,
        minSize: 5,
        validate: (f) => (f.name.startsWith("secret") ? "No secrets" : null),
      },
    );
    expect(result.accepted.map((f) => f.name)).toEqual(["ok.txt"]);
    expect(result.rejected.map((r) => [r.file.name, r.code, r.message])).toEqual([
      ["photo.png", "file-type", undefined],
      ["big.txt", "file-too-large", undefined],
      ["tiny.txt", "file-too-small", undefined],
      ["same.txt", "duplicate", undefined],
      ["secret.txt", "custom", "No secrets"],
    ]);
  });

  it("tells duplicates apart by size and date, and can allow them", () => {
    const existing = [file("a.txt", 10, "", 1)];
    expect(partitionFiles([file("a.txt", 11, "", 1)], existing, { multiple: true }).accepted).toHaveLength(1);
    expect(partitionFiles([file("a.txt", 10, "", 2)], existing, { multiple: true }).accepted).toHaveLength(1);
    expect(
      partitionFiles([file("a.txt", 10, "", 1)], existing, { multiple: true, allowDuplicates: true })
        .accepted,
    ).toHaveLength(1);
  });
});

describe("formatting", () => {
  it("formats sizes in steps of 1024", () => {
    expect(formatBytes(0, "en-US")).toBe("0 B");
    expect(formatBytes(512, "en-US")).toBe("512 B");
    expect(formatBytes(1536, "en-US")).toBe("1.5 kB");
    expect(formatBytes(5 * 1024 * 1024, "en-US")).toBe("5 MB");
    // German separates the unit with a non-breaking space.
    expect(formatBytes(1.5 * 1024 ** 3, "de-DE")).toMatch(/^1,5\sGB$/);
  });

  it("picks an icon family from the type or the extension", () => {
    expect(fileKind({ name: "a", type: "image/png" })).toBe("image");
    expect(fileKind({ name: "clip.MOV" })).toBe("video");
    expect(fileKind({ name: "a.pdf", type: "application/pdf" })).toBe("pdf");
    expect(fileKind({ name: "sheet.xlsx", type: "" })).toBe("spreadsheet");
    expect(fileKind({ name: "notes.docx" })).toBe("document");
    expect(fileKind({ name: "backup.zip" })).toBe("archive");
    expect(fileKind({ name: "unknown.xyz" })).toBe("other");
  });

  it("finds the stored file id in common response shapes", () => {
    expect(readFileId({ id: 7 })).toBe("7");
    expect(readFileId({ documentId: "doc-1" })).toBe("doc-1");
    expect(readFileId({ status: "complete", metadata: { storedName: "uuid.pdf" } })).toBe("uuid.pdf");
    expect(readFileId("plain text")).toBeUndefined();
  });
});

describe("transport", () => {
  const request = (overrides: Partial<ChunkRequest> = {}): ChunkRequest => ({
    file: file("report.pdf", 25),
    chunk: new Blob([new Uint8Array(10)]),
    index: 1,
    total: 3,
    offset: 10,
    uploadId: "up-1",
    signal: new AbortController().signal,
    onProgress: () => {},
    ...overrides,
  });

  it("builds the multipart body the Go chunk-uploader expects", async () => {
    const form = buildChunkForm(request(), { params: { folder: "invoices" } });
    expect(form.get("fileName")).toBe("report.pdf");
    expect(form.get("chunkIndex")).toBe("1");
    expect(form.get("totalChunks")).toBe("3");
    expect(form.get("fileSize")).toBe("25");
    expect(form.get("uploadId")).toBe("up-1");
    expect(form.get("additionalParams")).toBe('{"folder":"invoices"}');
    const chunk = form.get("chunk") as File;
    expect(chunk.size).toBe(10);
    expect(chunk.name).toBe("report.pdf");
  });

  it("renames fields and leaves out empty params", () => {
    const form = buildChunkForm(request(), {
      fieldNames: { chunk: "file", fileName: "originalname" },
      params: () => ({}),
    });
    expect(form.get("originalname")).toBe("report.pdf");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.has("chunk")).toBe(false);
    expect(form.has("additionalParams")).toBe(false);
  });

  it("retries server and network failures, not client errors or aborts", () => {
    expect(isRetryable(new UploadHttpError(503, null))).toBe(true);
    expect(isRetryable(new UploadHttpError(429, null))).toBe(true);
    expect(isRetryable(new UploadHttpError(408, null))).toBe(true);
    expect(isRetryable(new UploadHttpError(413, null))).toBe(false);
    expect(isRetryable(new Error("Network error"))).toBe(true);
    expect(isRetryable(new DOMException("Aborted", "AbortError"))).toBe(false);
  });
});

describe("selecting files", () => {
  it("adds idle items with a chunk plan and reports changes", () => {
    const onChange = vi.fn();
    const onRejected = vi.fn();
    const store = createUploaderStore({ multiple: true, chunkSize: 4, maxSize: 20, onChange, onRejected });

    const { accepted, rejected } = store.addFiles([file("a.txt", 10), file("huge.txt", 50)]);

    expect(accepted[0]).toMatchObject({ status: "idle", totalChunks: 3, chunkSize: 4, progress: 0 });
    expect(rejected[0]).toMatchObject({ code: "file-too-large" });
    expect(onChange).toHaveBeenCalledWith([accepted[0].file]);
    expect(onRejected).toHaveBeenCalledWith(rejected);
    expect(chunkCount(0, 4)).toBe(1);
  });

  it("replaces the file in single mode and clears old rejections", () => {
    const store = createUploaderStore({ accept: ".txt" });
    store.addFiles([file("a.txt"), file("b.png")]);
    expect(store.getSnapshot().rejections).toHaveLength(1);

    store.addFiles([file("c.txt")]);
    expect(store.getSnapshot().items.map((item) => item.file.name)).toEqual(["c.txt"]);
    expect(store.getSnapshot().rejections).toHaveLength(0);
  });

  it("removes, clears and dismisses", () => {
    const onChange = vi.fn();
    const store = createUploaderStore({ multiple: true, accept: ".txt", onChange });
    const { accepted } = store.addFiles([file("a.txt"), file("b.txt"), file("c.png")]);

    store.remove(accepted[0].id);
    expect(store.getSnapshot().items).toHaveLength(1);
    store.dismissRejection();
    expect(store.getSnapshot().rejections).toHaveLength(0);
    store.clear();
    expect(store.getSnapshot().items).toHaveLength(0);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe("uploading", () => {
  it("sends chunks in order with the same upload id, then succeeds", async () => {
    const { transport, calls } = instantTransport();
    const onFileSuccess = vi.fn();
    const onComplete = vi.fn();
    const store = createUploaderStore({ transport, chunkSize: 4, onFileSuccess, onComplete });
    const { accepted } = store.addFiles([file("a.bin", 10)]);

    const items = await store.upload();

    expect(calls.map((c) => [c.index, c.offset, c.chunk.size, c.total])).toEqual([
      [0, 0, 4, 3],
      [1, 4, 4, 3],
      [2, 8, 2, 3],
    ]);
    expect(new Set(calls.map((c) => c.uploadId))).toEqual(new Set([accepted[0].uploadId]));
    expect(items[0]).toMatchObject({ status: "success", progress: 1, uploadedBytes: 10, chunksDone: 3 });
    expect(readFileId(items[0].response)).toBe(`${accepted[0].uploadId}.bin`);
    expect(onFileSuccess).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledWith(items));
    expect(summarize(store.getSnapshot().items)).toMatchObject({ progress: 1, busy: false });
  });

  it("sends empty files as one chunk", async () => {
    const { transport, calls } = instantTransport();
    const store = createUploaderStore({ transport });
    store.addFiles([file("empty.txt", 0)]);
    const [item] = await store.upload();
    expect(calls).toHaveLength(1);
    expect(item.status).toBe("success");
  });

  it("uploads at most `concurrency` files at once", async () => {
    const { transport, pending } = manualTransport();
    const store = createUploaderStore({ transport, multiple: true, concurrency: 2 });
    store.addFiles([file("a.txt", 1, "", 1), file("b.txt", 1, "", 2), file("c.txt", 1, "", 3)]);

    const done = store.upload();
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    expect(store.getSnapshot().items.map((item) => item.status)).toEqual([
      "uploading",
      "uploading",
      "queued",
    ]);

    pending[0].resolve({});
    await vi.waitFor(() => expect(pending).toHaveLength(3));
    pending[1].resolve({});
    pending[2].resolve({});
    expect((await done).map((item) => item.status)).toEqual(["success", "success", "success"]);
  });

  it("retries a failed chunk with backoff, then carries on", async () => {
    let failures = 0;
    const { transport, calls } = instantTransport((request) => {
      if (request.index === 1 && failures < 2) {
        failures++;
        throw new UploadHttpError(503, null);
      }
      return { ok: true };
    });
    const store = createUploaderStore({ transport, chunkSize: 4, retries: 3, retryDelay: 1 });
    store.addFiles([file("a.bin", 10)]);

    const [item] = await store.upload();
    expect(item.status).toBe("success");
    expect(calls.map((c) => c.index)).toEqual([0, 1, 1, 1, 2]);
  });

  it("gives up on client errors and keeps confirmed chunks for a retry", async () => {
    let reject = true;
    const { transport, calls } = instantTransport((request) => {
      if (request.index === 1 && reject) throw new UploadHttpError(413, { message: "Too large" });
      return {};
    });
    const onFileError = vi.fn();
    const store = createUploaderStore({ transport, chunkSize: 4, retryDelay: 1, onFileError });
    store.addFiles([file("a.bin", 10)]);

    const [failed] = await store.upload();
    expect(failed).toMatchObject({ status: "error", chunksDone: 1, uploadedBytes: 4 });
    expect(failed.error).toContain("413");
    expect(onFileError).toHaveBeenCalledWith(failed, expect.any(UploadHttpError));

    reject = false;
    const [retried] = await store.upload([failed.id]);
    expect(retried.status).toBe("success");
    expect(calls.map((c) => c.index)).toEqual([0, 1, 1, 2]);
  });

  it("pauses mid-file and resumes from the chunk that was interrupted", async () => {
    const { transport, pending } = manualTransport();
    const store = createUploaderStore({ transport, chunkSize: 4 });
    const { accepted } = store.addFiles([file("a.bin", 10)]);
    const { id, uploadId } = accepted[0];

    void store.upload();
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    pending[0].resolve({});
    await vi.waitFor(() => expect(pending).toHaveLength(2));

    store.pause(id);
    await vi.waitFor(() => expect(store.getSnapshot().items[0].status).toBe("paused"));
    expect(store.getSnapshot().items[0]).toMatchObject({ chunksDone: 1, uploadedBytes: 4 });

    const resumed = store.upload([id]);
    await vi.waitFor(() => expect(pending).toHaveLength(3));
    expect(pending[2].request).toMatchObject({ index: 1, uploadId });
    pending[2].resolve({});
    await vi.waitFor(() => expect(pending).toHaveLength(4));
    pending[3].resolve({});
    expect((await resumed)[0].status).toBe("success");
  });

  it("cancels, and starts over with a new upload id", async () => {
    const { transport, pending } = manualTransport();
    const store = createUploaderStore({ transport, chunkSize: 4 });
    const { accepted } = store.addFiles([file("a.bin", 10)]);

    const first = store.upload();
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    store.cancel();
    expect((await first)[0]).toMatchObject({ status: "canceled", progress: 0, chunksDone: 0 });

    void store.upload();
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[1].request.index).toBe(0);
    expect(pending[1].request.uploadId).not.toBe(accepted[0].uploadId);
  });

  it("aborts the request when a file is removed mid-upload", async () => {
    const { transport, pending } = manualTransport();
    const store = createUploaderStore({ transport });
    const { accepted } = store.addFiles([file("a.bin", 10)]);

    const done = store.upload();
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    store.remove(accepted[0].id);

    expect(pending[0].request.signal.aborted).toBe(true);
    expect(await done).toEqual([]);
    expect(store.getSnapshot().items).toHaveLength(0);
  });

  it("uploads on add with autoUpload", async () => {
    const { transport, calls } = instantTransport();
    const store = createUploaderStore({ transport, autoUpload: true });
    store.addFiles([file("a.txt", 3)]);
    await vi.waitFor(() => expect(store.getSnapshot().items[0].status).toBe("success"));
    expect(calls).toHaveLength(1);
  });

  it("marks files as failed when there is nothing to send them with", async () => {
    const store = createUploaderStore();
    store.addFiles([file("a.txt")]);
    const [item] = await store.upload();
    expect(item.status).toBe("error");
    expect(item.error).toMatch(/endpoint or a transport/);
  });

  it("publishes progress once per whole percent", async () => {
    const listener = vi.fn();
    const transport: Transport = async (request) => {
      for (let sent = 0; sent <= request.chunk.size; sent += 10) request.onProgress(sent);
      return {};
    };
    const store = createUploaderStore({ transport, chunkSize: 100_000 });
    store.addFiles([file("a.bin", 100_000)]);
    store.subscribe(listener);
    await store.upload();
    // 10,000 progress calls; roughly one publish per percent plus the status changes.
    expect(listener.mock.calls.length).toBeLessThan(120);
  });
});
