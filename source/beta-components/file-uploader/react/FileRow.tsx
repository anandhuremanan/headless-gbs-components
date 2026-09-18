"use client";

import { memo, useCallback, type ReactNode } from "react";
import { fileKind, formatBytes } from "../core/format";
import type { UploaderStore } from "../core/store";
import type { ExistingFile, FileKind, UploaderLocaleText, UploadItem } from "../core/types";
import {
  DownloadIcon,
  FileKindIcon,
  PauseIcon,
  PlayIcon,
  RetryIcon,
  XIcon,
} from "./icons";
import { cx, type UploaderSlot } from "./props";

const percentFormats = new Map<string, Intl.NumberFormat>();

function formatPercent(value: number, locale?: string) {
  const key = locale ?? "";
  let format = percentFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    percentFormats.set(key, format);
  }
  return format.format(value);
}

interface SharedRowProps {
  preview: boolean;
  removable: boolean;
  disabled: boolean;
  locale?: string;
  text: UploaderLocaleText;
  classNames?: Partial<Record<UploaderSlot, string>>;
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="fu-icon-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Thumb({
  kind,
  className,
  children,
}: {
  kind: FileKind;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cx("fu-thumb", className)} data-kind={kind} aria-hidden="true">
      <FileKindIcon kind={kind} />
      {children}
    </span>
  );
}

interface FileRowProps extends SharedRowProps {
  item: UploadItem;
  store: UploaderStore;
  canUpload: boolean;
}

/** One selected file. Memoized: a progress tick re-renders only its own row. */
export const FileRow = memo(function FileRow({
  item,
  store,
  canUpload,
  preview,
  removable,
  disabled,
  locale,
  text,
  classNames,
}: FileRowProps) {
  const { file, status } = item;
  const kind = fileKind(file);
  const name = file.name;

  // React 19 ref cleanup: the object URL lives exactly as long as the <img>,
  // and unlike a base64 data URL it costs no memory copy of the file.
  const attachPreview = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file],
  );

  const percent = formatPercent(item.progress, locale);
  const size = formatBytes(file.size, locale);
  const label: Record<UploadItem["status"], string | null> = {
    idle: null,
    queued: text.queued,
    uploading: null,
    paused: `${text.paused} · ${percent}`,
    success: text.uploaded,
    error: text.failed,
    canceled: text.canceled,
  };
  const meta =
    status === "uploading"
      ? text.progress(formatBytes(item.uploadedBytes, locale), size, percent)
      : [size, label[status]].filter(Boolean).join(" · ");

  const showProgress =
    status === "uploading" || status === "paused" || (status === "error" && item.progress > 0);
  const inFlight = status === "uploading" || status === "queued";

  return (
    <li className={cx("fu-item", classNames?.item)} data-status={status}>
      <Thumb kind={kind} className={classNames?.thumb}>
        {preview && kind === "image" && (
          <img
            ref={attachPreview}
            alt=""
            decoding="async"
            // Formats the browser can't draw (e.g. HEIC) fall back to the icon underneath.
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </Thumb>

      <div className="fu-body">
        <span className="fu-name" title={name}>
          {name}
        </span>
        <span className="fu-meta">{meta}</span>
        {status === "error" && item.error && <span className="fu-item-error">{item.error}</span>}
        {showProgress && (
          <div
            className={cx("fu-progress", classNames?.progress)}
            role="progressbar"
            aria-label={name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(item.progress * 100)}
          >
            <span className="fu-progress-bar" style={{ transform: `scaleX(${item.progress})` }} />
          </div>
        )}
      </div>

      <div className={cx("fu-actions", classNames?.actions)}>
        {canUpload && status === "uploading" && (
          <IconButton label={text.pause(name)} disabled={disabled} onClick={() => store.pause(item.id)}>
            <PauseIcon />
          </IconButton>
        )}
        {canUpload && status === "paused" && (
          <IconButton label={text.resume(name)} disabled={disabled} onClick={() => void store.upload([item.id])}>
            <PlayIcon />
          </IconButton>
        )}
        {canUpload && (status === "error" || status === "canceled") && (
          <IconButton label={text.retry(name)} disabled={disabled} onClick={() => void store.upload([item.id])}>
            <RetryIcon />
          </IconButton>
        )}
        {inFlight || status === "paused" ? (
          <IconButton label={text.cancel(name)} disabled={disabled} onClick={() => store.cancel(item.id)}>
            <XIcon />
          </IconButton>
        ) : (
          removable && (
            <IconButton label={text.remove(name)} disabled={disabled} onClick={() => store.remove(item.id)}>
              <XIcon />
            </IconButton>
          )
        )}
      </div>
    </li>
  );
});

interface ExistingFileRowProps extends SharedRowProps {
  file: ExistingFile;
  onRemove?(file: ExistingFile): void;
}

/** A file already stored on the server. */
export const ExistingFileRow = memo(function ExistingFileRow({
  file,
  onRemove,
  preview,
  removable,
  disabled,
  locale,
  text,
  classNames,
}: ExistingFileRowProps) {
  const kind = fileKind(file);
  const meta = [file.size !== undefined ? formatBytes(file.size, locale) : null, text.uploaded]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={cx("fu-item", classNames?.item)} data-status="success" data-existing="">
      <Thumb kind={kind} className={classNames?.thumb}>
        {preview && kind === "image" && file.url && (
          <img
            src={file.url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </Thumb>

      <div className="fu-body">
        <span className="fu-name" title={file.name}>
          {file.name}
        </span>
        <span className="fu-meta">{meta}</span>
      </div>

      <div className={cx("fu-actions", classNames?.actions)}>
        {file.url && (
          <a
            className="fu-icon-button"
            href={file.url}
            download={file.name}
            target="_blank"
            rel="noreferrer"
            aria-label={text.download(file.name)}
            title={text.download(file.name)}
          >
            <DownloadIcon />
          </a>
        )}
        {removable && onRemove && (
          <IconButton label={text.remove(file.name)} disabled={disabled} onClick={() => onRemove(file)}>
            <XIcon />
          </IconButton>
        )}
      </div>
    </li>
  );
});
