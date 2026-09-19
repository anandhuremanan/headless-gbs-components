import type { ChunkRequest, Transport } from "./types";

/** Form field names for each chunk request. The defaults match the Go chunk-uploader. */
export interface ChunkFieldNames {
  chunk: string;
  fileName: string;
  chunkIndex: string;
  totalChunks: string;
  fileSize: string;
  uploadId: string;
  additionalParams: string;
}

export const DEFAULT_FIELD_NAMES: ChunkFieldNames = {
  chunk: "chunk",
  fileName: "fileName",
  chunkIndex: "chunkIndex",
  totalChunks: "totalChunks",
  fileSize: "fileSize",
  uploadId: "uploadId",
  additionalParams: "additionalParams",
};

export type UploadParams = Record<string, unknown>;

export interface HttpTransportOptions {
  endpoint: string | ((request: ChunkRequest) => string);
  method?: "POST" | "PUT" | "PATCH";
  /** Static headers, or a function (async allowed) for tokens that expire. */
  headers?:
    | Record<string, string>
    | ((request: ChunkRequest) => Record<string, string> | Promise<Record<string, string>>);
  /** Send cookies on cross-origin requests. */
  withCredentials?: boolean;
  fieldNames?: Partial<ChunkFieldNames>;
  /** Extra data sent as JSON in the `additionalParams` field. */
  params?: UploadParams | ((file: File) => UploadParams);
  /** Turns the response text into the value stored on the item. Default: JSON, else text. */
  parseResponse?(body: string, xhr: XMLHttpRequest): unknown;
}

/** A non-2xx response. `body` is the parsed response. */
export class UploadHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Upload failed with status ${status}`);
    this.name = "UploadHttpError";
    this.status = status;
    this.body = body;
  }
}

export const abortError = () => new DOMException("Upload aborted", "AbortError");

/** Network failures, timeouts, rate limits and server errors are worth another try; 4xx is not. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  if (error instanceof UploadHttpError) {
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }
  return true;
}

/** The multipart body for one chunk. Metadata comes first so streaming parsers see it before the bytes. */
export function buildChunkForm(
  request: ChunkRequest,
  options: Pick<HttpTransportOptions, "fieldNames" | "params"> = {},
): FormData {
  const names = { ...DEFAULT_FIELD_NAMES, ...options.fieldNames };
  const form = new FormData();
  form.append(names.uploadId, request.uploadId);
  form.append(names.fileName, request.file.name);
  form.append(names.chunkIndex, String(request.index));
  form.append(names.totalChunks, String(request.total));
  form.append(names.fileSize, String(request.file.size));

  const params =
    typeof options.params === "function" ? options.params(request.file) : options.params;
  if (params && Object.keys(params).length > 0) {
    form.append(names.additionalParams, JSON.stringify(params));
  }

  form.append(names.chunk, request.chunk, request.file.name);
  return form;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Sends each chunk as `multipart/form-data`. Uses XMLHttpRequest rather than
 * fetch because fetch still can't report upload progress in every browser.
 */
export function createHttpTransport(options: HttpTransportOptions): Transport {
  return async (request) => {
    const url =
      typeof options.endpoint === "function" ? options.endpoint(request) : options.endpoint;
    const headers =
      typeof options.headers === "function" ? await options.headers(request) : options.headers;
    const body = buildChunkForm(request, options);

    return new Promise((resolve, reject) => {
      const { signal } = request;
      if (signal.aborted) {
        reject(abortError());
        return;
      }

      const xhr = new XMLHttpRequest();
      const onAbort = () => xhr.abort();

      xhr.open(options.method ?? "POST", url);
      xhr.withCredentials = options.withCredentials ?? false;
      for (const [name, value] of Object.entries(headers ?? {})) {
        xhr.setRequestHeader(name, value);
      }

      // `loaded` includes the multipart framing, so cap it at the chunk's size.
      xhr.upload.onprogress = (event) =>
        request.onProgress(Math.min(event.loaded, request.chunk.size));
      xhr.onload = () => {
        // A parseResponse that throws would otherwise leave this promise
        // pending forever, and the file would sit at "uploading" with no error
        // and no way back.
        let parsed: unknown;
        try {
          parsed = options.parseResponse
            ? options.parseResponse(xhr.responseText, xhr)
            : parseBody(xhr.responseText);
        } catch (error) {
          reject(error);
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
        else reject(new UploadHttpError(xhr.status, parsed));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Request timed out"));
      xhr.onabort = () => reject(abortError());
      xhr.onloadend = () => signal.removeEventListener("abort", onAbort);

      signal.addEventListener("abort", onAbort, { once: true });
      xhr.send(body);
    });
  };
}
