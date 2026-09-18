export type UploadStatus =
  /** Selected, not sent yet. */
  | "idle"
  /** Waiting for a free upload slot. */
  | "queued"
  | "uploading"
  | "paused"
  | "success"
  | "error"
  | "canceled";

export interface UploadItem {
  /** Stable key for the row. */
  id: string;
  /**
   * Sent with every chunk so the server can group them. Resuming after a pause
   * or an error keeps it; starting again after a cancel gets a new one.
   */
  uploadId: string;
  file: File;
  status: UploadStatus;
  /** Bytes confirmed by the server plus the bytes of the chunk in flight. */
  uploadedBytes: number;
  /** 0 to 1. */
  progress: number;
  chunkSize: number;
  chunksDone: number;
  totalChunks: number;
  error?: string;
  /** The server's answer to the most recent chunk; for the last chunk, the finished file. */
  response?: unknown;
}

export type RejectionCode =
  | "file-type"
  | "file-too-large"
  | "file-too-small"
  | "too-many-files"
  | "duplicate"
  | "custom";

export interface FileRejection {
  id: string;
  file: File;
  code: RejectionCode;
  /** Set for `custom`: the text returned by `validate`. */
  message?: string;
}

export interface UploaderSnapshot {
  items: readonly UploadItem[];
  /** From the most recent selection; replaced by the next one. */
  rejections: readonly FileRejection[];
}

/** One chunk, as handed to a transport. */
export interface ChunkRequest {
  file: File;
  chunk: Blob;
  /** 0-based. */
  index: number;
  total: number;
  /** Byte position of this chunk in the file. */
  offset: number;
  uploadId: string;
  signal: AbortSignal;
  /** Report bytes of this chunk sent so far. */
  onProgress(loaded: number): void;
}

/** Sends one chunk and resolves with the server's answer. Throw to fail it. */
export type Transport = (request: ChunkRequest) => Promise<unknown>;

/** A file already on the server, e.g. when editing a saved record. */
export interface ExistingFile {
  id: string;
  name: string;
  size?: number;
  type?: string;
  /** Download link; also the preview for images. */
  url?: string;
}

export type FileKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "spreadsheet"
  | "document"
  | "archive"
  | "other";

export type UploaderSize = "sm" | "md" | "lg";

export interface UploaderLocaleText {
  dropzone: string;
  browse: string;
  dropHere: string;
  hintTypes(types: string): string;
  hintMaxSize(size: string): string;
  hintMaxFiles(count: string): string;
  upload(count: string): string;
  cancelAll: string;
  clear: string;
  dismiss: string;
  remove(name: string): string;
  cancel(name: string): string;
  pause(name: string): string;
  resume(name: string): string;
  retry(name: string): string;
  download(name: string): string;
  queued: string;
  paused: string;
  uploaded: string;
  canceled: string;
  failed: string;
  progress(sent: string, total: string, percent: string): string;
  rejectFileType(name: string): string;
  rejectTooLarge(name: string, max: string): string;
  rejectTooSmall(name: string, min: string): string;
  rejectTooMany(max: string): string;
  rejectDuplicate(name: string): string;
  announceDone(name: string): string;
  announceFailed(name: string): string;
}
