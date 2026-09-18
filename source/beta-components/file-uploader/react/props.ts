import type { AddResult } from "../core/store";
import type { UploadItem } from "../core/types";

export type UploaderSlot =
  | "root"
  | "label"
  | "dropzone"
  | "rejections"
  | "list"
  | "item"
  | "thumb"
  | "progress"
  | "actions"
  | "footer";

export interface FileUploaderHandle {
  /** Opens the system file picker. */
  open(): void;
  /** Adds files from code, with the same validation as a drop. */
  addFiles(files: Iterable<File> | ArrayLike<File>): AddResult;
  /** Uploads every file not uploaded yet. Resolves when they have all stopped. */
  upload(): Promise<UploadItem[]>;
  pause(id?: string): void;
  cancel(id?: string): void;
  clear(): void;
  getFiles(): File[];
  getItems(): readonly UploadItem[];
}

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
