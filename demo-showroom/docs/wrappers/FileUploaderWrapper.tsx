"use client";

import { useState } from "react";
import {
  FileUploader,
  readFileId,
  type Transport,
} from "../../../source/beta-components/file-uploader";

/**
 * The docs site has no upload server, so this example simulates one: each chunk
 * "uploads" over about half a second and answers like the Go chunk-uploader.
 * In an app, pass `endpoint="/api/upload"` instead of `transport`.
 */
const simulatedServer: Transport = (request) =>
  new Promise((resolve, reject) => {
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      request.onProgress((request.chunk.size * step) / 10);
      if (step < 10) return;
      clearInterval(timer);
      const last = request.index === request.total - 1;
      resolve(
        last
          ? {
              status: "complete",
              metadata: {
                storedName: `${request.uploadId}-${request.file.name}`,
              },
            }
          : { status: "chunk_received" },
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

/** Live example used in the FileUploader documentation. */
export function FileUploaderWrapper() {
  const [ids, setIds] = useState<string[]>([]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 520,
      }}
    >
      <FileUploader
        label="Attachments"
        multiple
        maxFiles={5}
        maxSize={50 * 1024 * 1024}
        chunkSize={512 * 1024}
        transport={simulatedServer}
        description="Files over 512 KB are split into chunks. Try pausing a large one."
        onUploadComplete={(items) =>
          setIds((current) => [
            ...current,
            ...items
              .filter((item) => item.status === "success")
              .map((item) => readFileId(item.response) ?? item.id),
          ])
        }
      />
      <code style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
        uploaded: {ids.length > 0 ? ids.join(", ") : "none"}
      </code>
    </div>
  );
}

export default FileUploaderWrapper;
