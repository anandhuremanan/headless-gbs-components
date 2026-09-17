import type { FileKind } from "./types";

const UNITS = ["kilobyte", "megabyte", "gigabyte", "terabyte"] as const;
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string | undefined, unit?: (typeof UNITS)[number]) {
  const key = `${locale ?? ""}|${unit ?? "plain"}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.NumberFormat(
      locale,
      unit
        ? { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 1 }
        : { maximumFractionDigits: 0 },
    );
    formatters.set(key, found);
  }
  return found;
}

/** `1536` → `1.5 kB`, localized. Steps of 1024, as file managers show sizes. */
export function formatBytes(bytes: number, locale?: string): string {
  let value = Math.max(0, bytes);
  // Intl spells plain bytes out ("512 byte"), so they get a short suffix instead.
  if (value < 1024) return `${formatter(locale).format(value)} B`;
  let unit = -1;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return formatter(locale, UNITS[unit]).format(value);
}

const EXTENSIONS: Record<Exclude<FileKind, "other">, readonly string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "avif", "heic", "ico"],
  video: ["mp4", "mov", "webm", "mkv", "avi", "m4v"],
  audio: ["mp3", "wav", "ogg", "m4a", "flac", "aac"],
  pdf: ["pdf"],
  spreadsheet: ["xls", "xlsx", "csv", "ods", "tsv"],
  document: ["doc", "docx", "txt", "rtf", "odt", "md", "ppt", "pptx"],
  archive: ["zip", "rar", "7z", "tar", "gz", "tgz"],
};

/** Picks an icon family from the MIME type, falling back to the extension. */
export function fileKind(file: { name: string; type?: string }): FileKind {
  const type = (file.type ?? "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("spreadsheet") || type.includes("excel") || type === "text/csv") {
    return "spreadsheet";
  }

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  for (const [kind, list] of Object.entries(EXTENSIONS)) {
    if (list.includes(extension)) return kind as FileKind;
  }
  return "other";
}

const get = (value: unknown, key: string): unknown =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;

const asId = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

/**
 * Finds the stored file's id in common response shapes: `id`, `fileId`,
 * `documentId`, or `metadata.storedName` as returned by the Go chunk-uploader.
 */
export function readFileId(response: unknown): string | undefined {
  return (
    asId(get(response, "id")) ??
    asId(get(response, "fileId")) ??
    asId(get(response, "documentId")) ??
    asId(get(get(response, "metadata"), "storedName"))
  );
}
