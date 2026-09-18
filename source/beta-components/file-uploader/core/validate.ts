import type { RejectionCode } from "./types";

export interface ValidationRules {
  /** Same syntax as `<input accept>`: `.pdf`, `image/*`, `application/json`. */
  accept?: string;
  /** Bytes. */
  maxSize?: number;
  /** Bytes. */
  minSize?: number;
  /** Total files, counting ones already selected. Ignored when `multiple` is false. */
  maxFiles?: number;
  /** When false, a new file replaces the current one. Default false. */
  multiple?: boolean;
  /** Keep a file that matches one already selected (same name, size and date). */
  allowDuplicates?: boolean;
  /** Return a message to reject the file. */
  validate?(file: File): string | null | undefined;
}

/** Whether a file matches an `accept` string, the way the browser's picker reads it. */
export function matchesAccept(file: { name: string; type: string }, accept?: string): boolean {
  const tokens = (accept ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/** Two picks of the same file on disk produce the same key. */
export const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export interface Partitioned {
  accepted: File[];
  rejected: { file: File; code: RejectionCode; message?: string }[];
}

function check(file: File, rules: ValidationRules): { code: RejectionCode; message?: string } | null {
  if (!matchesAccept(file, rules.accept)) return { code: "file-type" };
  if (rules.maxSize !== undefined && file.size > rules.maxSize) return { code: "file-too-large" };
  if (rules.minSize !== undefined && file.size < rules.minSize) return { code: "file-too-small" };
  const message = rules.validate?.(file);
  if (message) return { code: "custom", message };
  return null;
}

/**
 * Splits a new selection into files to keep and files to reject, with a reason
 * for each. In single mode the first valid file will replace the current one.
 */
export function partitionFiles(
  incoming: readonly File[],
  existing: readonly File[],
  rules: ValidationRules = {},
): Partitioned {
  const multiple = rules.multiple ?? false;
  const seen = new Set(multiple ? existing.map(fileKey) : []);
  let room = multiple ? (rules.maxFiles ?? Infinity) - existing.length : 1;
  const result: Partitioned = { accepted: [], rejected: [] };

  for (const file of incoming) {
    const failure = check(file, rules);
    if (failure) {
      result.rejected.push({ file, ...failure });
    } else if (!rules.allowDuplicates && seen.has(fileKey(file))) {
      result.rejected.push({ file, code: "duplicate" });
    } else if (room <= 0) {
      result.rejected.push({ file, code: "too-many-files" });
    } else {
      result.accepted.push(file);
      seen.add(fileKey(file));
      room--;
    }
  }
  return result;
}
