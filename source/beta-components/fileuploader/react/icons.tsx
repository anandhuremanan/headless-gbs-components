import type { SVGProps } from "react";
import type { FileKind } from "../core/types";

type IconProps = SVGProps<SVGSVGElement>;

function Svg(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const UploadIcon = (p: IconProps) => (
  <Svg width={28} height={28} strokeWidth={1.75} {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M20 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
  </Svg>
);
export const XIcon = (p: IconProps) => <Svg width={14} height={14} {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const PauseIcon = (p: IconProps) => <Svg width={14} height={14} {...p}><path d="M8 5v14M16 5v14" /></Svg>;
export const PlayIcon = (p: IconProps) => <Svg width={14} height={14} {...p}><path d="M7 4.5v15L19 12Z" /></Svg>;
export const RetryIcon = (p: IconProps) => (
  <Svg width={14} height={14} {...p}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg width={14} height={14} {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
  </Svg>
);
export const AlertIcon = (p: IconProps) => (
  <Svg width={14} height={14} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Svg>
);

const KIND_PATHS: Record<FileKind, string> = {
  image: "M3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01",
  video: "m10 9 5 3-5 3Z",
  audio: "M9 18V6l10-2v12M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  pdf: "M8 13h8M8 17h5",
  spreadsheet: "M8 12h8M8 16h8M12 12v6",
  document: "M8 12h8M8 16h8",
  archive: "M11 4h2M11 7h2M11 10h2M10 13h4v4h-4Z",
  other: "",
};

/** A page outline with a mark for the kind of file. */
export function FileKindIcon({ kind, ...p }: IconProps & { kind: FileKind }) {
  if (kind === "image" || kind === "video" || kind === "audio") {
    return (
      <Svg width={20} height={20} {...p}>
        {kind === "audio" ? null : <rect x="3" y="4" width="18" height="16" rx="2" />}
        <path d={KIND_PATHS[kind]} />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      {KIND_PATHS[kind] && <path d={KIND_PATHS[kind]} />}
    </Svg>
  );
}
