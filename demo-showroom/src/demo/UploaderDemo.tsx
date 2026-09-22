import { useMemo, useRef, useState } from "react";
import {
  FileUploader,
  readFileId,
  UploadHttpError,
  type ExistingFile,
  type FileUploaderHandle,
  type Transport,
} from "../../../source/beta-components/file-uploader";

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";
const button =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";

/**
 * Stands in for an upload server so the demo runs without one. Each chunk
 * reports progress over ~400 ms and answers like the Go chunk-uploader;
 * `failRate` makes chunks fail with a 503, which the uploader retries.
 */
function simulatedServer(failRate: () => number): Transport {
  return (request) =>
    new Promise((resolve, reject) => {
      let step = 0;
      const timer = setInterval(() => {
        step += 1;
        request.onProgress((request.chunk.size * step) / 8);
        if (step < 8) return;
        clearInterval(timer);
        if (Math.random() < failRate()) {
          reject(new UploadHttpError(503, { message: "Service unavailable" }));
          return;
        }
        const last = request.index === request.total - 1;
        resolve(
          last
            ? {
                status: "complete",
                metadata: {
                  storedName: `${request.uploadId}-${request.file.name}`,
                },
              }
            : { status: "chunk_received", chunkIndex: request.index },
        );
      }, 50);
      request.signal.addEventListener(
        "abort",
        () => {
          clearInterval(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
}

const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#60a5fa"/><circle cx="28" cy="30" r="9" fill="#fff"/><path d="M0 70 30 44l18 16 12-10 20 20Z" fill="#1d4ed8"/></svg>',
)}`;
const SAMPLE_PDF = URL.createObjectURL(
  new Blob(["%PDF-1.4 sample"], { type: "application/pdf" }),
);

const INITIAL_EXISTING: ExistingFile[] = [
  {
    id: "doc-101",
    name: "site-photo.svg",
    size: 412,
    type: "image/svg+xml",
    url: SAMPLE_IMAGE,
  },
  {
    id: "doc-102",
    name: "contract-signed.pdf",
    size: 248_000,
    url: SAMPLE_PDF,
  },
];

export function UploaderDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChunkedUpload />
      <ValidatedImages />
      <EditRecord />
      <NativeForm />
    </div>
  );
}

function ChunkedUpload() {
  const [flaky, setFlaky] = useState(false);
  const [preview, setPreview] = useState(true);
  // Chunks already in flight keep the transport they started with.
  const transport = useMemo(
    () => simulatedServer(() => (flaky ? 0.35 : 0)),
    [flaky],
  );
  const [results, setResults] = useState<string[]>([]);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Chunked upload</h2>
      <p className={cardNote}>
        256 KB chunks, two files at a time. Pause, resume and cancel from each
        row. With a flaky server, failed chunks retry with backoff before a file
        gives up.
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={flaky}
              onChange={(event) => setFlaky(event.target.checked)}
            />
            Flaky server
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={preview}
              onChange={(event) => setPreview(event.target.checked)}
            />
            Image previews
          </label>
        </div>
        <FileUploader
          label="Project files"
          multiple
          maxFiles={8}
          chunkSize={256 * 1024}
          concurrency={2}
          retries={2}
          retryDelay={300}
          preview={preview}
          transport={transport}
          onUploadComplete={(items) =>
            setResults(
              items
                .filter((item) => item.status === "success")
                .map((item) => readFileId(item.response) ?? item.id),
            )
          }
        />
        <p className="break-all text-xs text-zinc-600 dark:text-zinc-400">
          Last run stored:{" "}
          {results.length > 0 ? results.join(", ") : "nothing yet"}
        </p>
      </div>
    </section>
  );
}

const noFailures = simulatedServer(() => 0);

function ValidatedImages() {
  return (
    <section className={card}>
      <h2 className={cardTitle}>Validation and auto upload</h2>
      <p className={cardNote}>
        Images only, up to 2 MB each and three in total, no duplicates. Accepted
        files upload right away; rejected ones say why.
      </p>
      <FileUploader
        label="Gallery"
        multiple
        accept="image/*"
        maxSize={2 * 1024 * 1024}
        maxFiles={3}
        autoUpload
        transport={noFailures}
        validate={(file) =>
          file.name.toLowerCase().includes("draft")
            ? `${file.name} looks like a draft`
            : null
        }
        description="Files with “draft” in the name are rejected by a custom rule."
      />
    </section>
  );
}

function EditRecord() {
  const [existing, setExisting] = useState(INITIAL_EXISTING);
  const [saved, setSaved] = useState<string | null>(null);
  const uploader = useRef<FileUploaderHandle>(null);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Editing a saved record</h2>
      <p className={cardNote}>
        Files already on the server show with download links. New files wait
        until “Save”, which calls
        <code className="px-1">ref.upload()</code>.
      </p>
      <div className="flex flex-col gap-3">
        <FileUploader
          ref={uploader}
          label="Contract documents"
          multiple
          size="sm"
          accept=".pdf,image/*"
          transport={noFailures}
          existingFiles={existing}
          onRemoveExisting={(file) =>
            setExisting((current) =>
              current.filter((item) => item.id !== file.id),
            )
          }
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={button}
            onClick={async () => {
              const items = await uploader.current?.upload();
              setSaved(
                `Saved: ${existing.length} kept, ${items?.filter((item) => item.status === "success").length ?? 0} uploaded`,
              );
            }}
          >
            Save
          </button>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {saved}
          </span>
        </div>
      </div>
    </section>
  );
}

function NativeForm() {
  const [posted, setPosted] = useState<string | null>(null);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Plain form, no endpoint</h2>
      <p className={cardNote}>
        Without an endpoint the files post with the form under{" "}
        <code className="px-1">name</code> — ready for a Server Action or a
        classic form handler. Previews are off here.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const files = new FormData(event.currentTarget).getAll(
            "attachments",
          ) as File[];
          setPosted(
            files.length > 0
              ? files.map((file) => `${file.name} (${file.size} B)`).join(", ")
              : "no files",
          );
        }}
      >
        <FileUploader
          label="Attachments"
          name="attachments"
          multiple
          preview={false}
        />
        <div className="flex items-center gap-2">
          <button type="submit" className={button}>
            Submit
          </button>
          <span className="break-all text-xs text-zinc-600 dark:text-zinc-400">
            {posted ?? "not submitted"}
          </span>
        </div>
      </form>
    </section>
  );
}
