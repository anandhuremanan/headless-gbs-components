"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  type Ref,
} from "react";
import { formatBytes, readFileId } from "../core/format";
import { summarize } from "../core/store";
import { createHttpTransport, type HttpTransportOptions } from "../core/transport";
import type {
  ExistingFile,
  FileRejection,
  Transport,
  UploaderLocaleText,
  UploaderSize,
  UploadItem,
} from "../core/types";
import { ExistingFileRow, FileRow } from "./FileRow";
import { AlertIcon, UploadIcon, XIcon } from "./icons";
import { defaultUploaderText } from "./locale";
import { cx, type FileUploaderHandle, type UploaderSlot } from "./props";
import { useFileUploader } from "./useFileUploader";

export interface FileUploaderProps {
  /* ----------------------------------------------------------- selection */
  /** Several files. When false, a new file replaces the current one. Default false. */
  multiple?: boolean;
  /** Same syntax as `<input accept>`: `.pdf`, `image/*`, `application/json`. */
  accept?: string;
  /** Total files, counting ones already selected. */
  maxFiles?: number;
  /** Bytes per file. */
  maxSize?: number;
  /** Bytes per file. */
  minSize?: number;
  /** Return a message to reject a file. */
  validate?(file: File): string | null | undefined;
  allowDuplicates?: boolean;

  /* ------------------------------------------------------------- upload */
  /** Where chunks are POSTed. Without `endpoint` or `transport`, files are only selected. */
  endpoint?: HttpTransportOptions["endpoint"];
  method?: HttpTransportOptions["method"];
  headers?: HttpTransportOptions["headers"];
  withCredentials?: boolean;
  /** Extra data sent as JSON with every chunk. */
  params?: HttpTransportOptions["params"];
  fieldNames?: HttpTransportOptions["fieldNames"];
  parseResponse?: HttpTransportOptions["parseResponse"];
  /** Replaces the built-in HTTP transport, e.g. for presigned URLs or an SDK. */
  transport?: Transport;
  /** Bytes per request. Default 5 MiB. */
  chunkSize?: number;
  /** Files uploading at once. Default 3. */
  concurrency?: number;
  /** Extra attempts per chunk. Default 3. */
  retries?: number;
  /** First retry delay in ms, doubled each time. Default 1000. */
  retryDelay?: number;
  /** Upload as soon as files are added. Default false. */
  autoUpload?: boolean;
  /** The value posted for an uploaded file. Default: the id found in the server's response. */
  getFileId?(item: UploadItem): string | undefined;

  /* ------------------------------------------------------ display & form */
  /** Thumbnails for images. Default true. */
  preview?: boolean;
  /** Files already stored, shown above new ones. */
  existingFiles?: readonly ExistingFile[];
  onRemoveExisting?(file: ExistingFile): void;
  /** Show remove buttons. Default true. */
  removable?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  /** Message below the drop zone; also marks it invalid. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  size?: UploaderSize;
  /**
   * Form field name. With an endpoint, the stored file ids are posted; without
   * one, the files themselves are, so a plain form or Server Action gets them.
   */
  name?: string;
  id?: string;
  /** For sizes and percentages. */
  locale?: string;
  className?: string;
  classNames?: Partial<Record<UploaderSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<UploaderLocaleText>;

  /* ------------------------------------------------------------- events */
  /** Selected files changed. */
  onChange?(files: File[]): void;
  onRejected?(rejections: FileRejection[]): void;
  onFileSuccess?(item: UploadItem): void;
  onFileError?(item: UploadItem, error: unknown): void;
  /** Every file in an upload run has stopped (uploaded, failed, paused or canceled). */
  onUploadComplete?(items: UploadItem[]): void;

  ref?: Ref<FileUploaderHandle>;
}

/** `.pdf, image/*` → `PDF, image/*` for the hint line. */
const describeAccept = (accept: string) =>
  accept
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (token.startsWith(".") ? token.slice(1).toUpperCase() : token))
    .join(", ");

const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

/** Drop, browse or paste files; upload them in resumable chunks with progress. */
export function FileUploader(props: FileUploaderProps) {
  const {
    ref,
    multiple = false,
    accept,
    maxFiles,
    maxSize,
    minSize,
    validate,
    allowDuplicates,
    endpoint,
    method,
    headers,
    withCredentials,
    params,
    fieldNames,
    parseResponse,
    transport: customTransport,
    chunkSize,
    concurrency,
    retries,
    retryDelay,
    autoUpload = false,
    getFileId,
    preview = true,
    existingFiles,
    onRemoveExisting,
    removable = true,
    label,
    description,
    error,
    required = false,
    disabled = false,
    size = "md",
    name,
    id: idProp,
    locale,
    className,
    classNames,
    style,
    localeText,
    onChange,
    onRejected,
    onFileSuccess,
    onFileError,
    onUploadComplete,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultUploaderText, ...localeText }), [localeText]);

  const pickerRef = useRef<HTMLInputElement>(null);
  const formFilesRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const transport = useMemo<Transport | undefined>(() => {
    if (customTransport) return customTransport;
    if (!endpoint) return undefined;
    return createHttpTransport({
      endpoint,
      method,
      headers,
      withCredentials,
      params,
      fieldNames,
      parseResponse,
    });
  }, [customTransport, endpoint, method, headers, withCredentials, params, fieldNames, parseResponse]);

  const { store, items, rejections } = useFileUploader({
    multiple,
    accept,
    maxFiles,
    maxSize,
    minSize,
    validate,
    allowDuplicates,
    transport,
    chunkSize,
    concurrency,
    retries,
    retryDelay,
    autoUpload,
    onChange,
    onRejected,
    onFileSuccess(item) {
      setAnnouncement(text.announceDone(item.file.name));
      onFileSuccess?.(item);
    },
    onFileError(item, reason) {
      setAnnouncement(text.announceFailed(item.file.name));
      onFileError?.(item, reason);
    },
    onComplete: onUploadComplete,
  });

  const canUpload = transport !== undefined;
  const postsFiles = Boolean(name) && !canUpload;

  // Without an endpoint the files ride along with the form, in a hidden file input.
  useEffect(() => {
    const input = formFilesRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const item of items) transfer.items.add(item.file);
    input.files = transfer.files;
  }, [items, postsFiles]);

  const open = () => {
    if (!disabled) pickerRef.current?.click();
  };

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        if (!disabled) pickerRef.current?.click();
      },
      addFiles: (files) => store.addFiles(files),
      upload: () => store.upload(),
      pause: (fileId) => store.pause(fileId),
      cancel: (fileId) => store.cancel(fileId),
      clear: () => store.clear(),
      getFiles: () => store.getSnapshot().items.map((item) => item.file),
      getItems: () => store.getSnapshot().items,
    }),
    [store, disabled],
  );

  const add = (files: FileList | null | undefined) => {
    if (disabled || !files || files.length === 0) return;
    store.addFiles(files);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !carriesFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !carriesFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  // dragenter/leave fire for every child the pointer crosses, so count the depth.
  const onDragLeave = () => {
    if (!dragging) return;
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    add(event.dataTransfer.files);
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (event.clipboardData.files.length === 0) return;
    event.preventDefault();
    add(event.clipboardData.files);
  };

  const rejectionText = (rejection: FileRejection): string => {
    const fileName = rejection.file.name;
    switch (rejection.code) {
      case "file-type":
        return text.rejectFileType(fileName);
      case "file-too-large":
        return text.rejectTooLarge(fileName, formatBytes(maxSize ?? 0, locale));
      case "file-too-small":
        return text.rejectTooSmall(fileName, formatBytes(minSize ?? 0, locale));
      case "too-many-files":
        return text.rejectTooMany(String(multiple ? (maxFiles ?? 1) : 1));
      case "duplicate":
        return text.rejectDuplicate(fileName);
      case "custom":
        return rejection.message ?? fileName;
    }
  };

  const hints = [
    accept ? text.hintTypes(describeAccept(accept)) : null,
    maxSize !== undefined ? text.hintMaxSize(formatBytes(maxSize, locale)) : null,
    multiple && maxFiles !== undefined && Number.isFinite(maxFiles)
      ? text.hintMaxFiles(String(maxFiles))
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const summary = summarize(items);
  const uploadedIds = name && canUpload
    ? items
        .filter((item) => item.status === "success")
        .map((item) => getFileId?.(item) ?? readFileId(item.response) ?? item.uploadId)
    : [];
  const hasRows = items.length > 0 || (existingFiles?.length ?? 0) > 0;
  const showFooter = items.length > 0 && (canUpload || multiple);
  const describedBy =
    cx(
      hints ? `${id}-hint` : "",
      description ? `${id}-description` : "",
      error ? `${id}-error` : "",
    ) || undefined;

  const rowProps = { preview, removable, disabled, locale, text, classNames };

  return (
    <div
      className={cx("fu-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={error ? "" : undefined}
      onPaste={onPaste}
    >
      {label && (
        <span
          id={`${id}-label`}
          className={cx("fu-label", classNames?.label)}
          data-required={required || undefined}
        >
          {label}
        </span>
      )}

      <div
        className={cx("fu-dropzone", classNames?.dropzone)}
        data-dragging={dragging || undefined}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button
          type="button"
          id={id}
          className="fu-trigger"
          disabled={disabled}
          aria-labelledby={label ? `${id}-label ${id}-cta` : undefined}
          aria-describedby={describedBy}
          onClick={open}
        >
          <UploadIcon className="fu-dropzone-icon" />
          <span id={`${id}-cta`} className="fu-dropzone-text">
            {dragging ? (
              text.dropHere
            ) : (
              <>
                {text.dropzone} <span className="fu-browse">{text.browse}</span>
              </>
            )}
          </span>
          {hints && (
            <span id={`${id}-hint`} className="fu-hint">
              {hints}
            </span>
          )}
        </button>
        <input
          ref={pickerRef}
          type="file"
          className="fu-sr-only"
          tabIndex={-1}
          aria-hidden="true"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            add(event.currentTarget.files);
            // Let the same file be picked again after it was removed.
            event.currentTarget.value = "";
          }}
        />
      </div>

      {description && (
        <span id={`${id}-description`} className="fu-description">
          {description}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="fu-error" role="alert">
          {error}
        </span>
      )}

      {postsFiles && <input ref={formFilesRef} type="file" name={name} multiple hidden tabIndex={-1} />}
      {uploadedIds.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {name &&
        existingFiles?.map((file) => (
          <input key={file.id} type="hidden" name={`${name}-existing`} value={file.id} />
        ))}

      {rejections.length > 0 && (
        <ul className={cx("fu-rejections", classNames?.rejections)} role="alert">
          {rejections.map((rejection) => (
            <li key={rejection.id} className="fu-rejection">
              <AlertIcon />
              <span>{rejectionText(rejection)}</span>
              <button
                type="button"
                className="fu-icon-button"
                aria-label={text.dismiss}
                title={text.dismiss}
                onClick={() => store.dismissRejection(rejection.id)}
              >
                <XIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasRows && (
        <ul
          className={cx("fu-list", classNames?.list)}
          aria-labelledby={label ? `${id}-label` : undefined}
        >
          {existingFiles?.map((file) => (
            <ExistingFileRow key={`existing-${file.id}`} file={file} onRemove={onRemoveExisting} {...rowProps} />
          ))}
          {items.map((item) => (
            <FileRow key={item.id} item={item} store={store} canUpload={canUpload} {...rowProps} />
          ))}
        </ul>
      )}

      {showFooter && (
        <div className={cx("fu-footer", classNames?.footer)}>
          {summary.busy ? (
            <>
              <div
                className="fu-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(summary.progress * 100)}
                aria-label={typeof label === "string" ? label : undefined}
              >
                <span className="fu-progress-bar" style={{ transform: `scaleX(${summary.progress})` }} />
              </div>
              <span className="fu-footer-text">
                {formatBytes(summary.uploadedBytes, locale)} / {formatBytes(summary.totalBytes, locale)}
              </span>
              <button type="button" className="fu-button" disabled={disabled} onClick={() => store.cancel()}>
                {text.cancelAll}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="fu-button" disabled={disabled} onClick={() => store.clear()}>
                {text.clear}
              </button>
              {canUpload && summary.startable > 0 && (
                <button
                  type="button"
                  className="fu-button"
                  data-variant="primary"
                  disabled={disabled}
                  onClick={() => void store.upload()}
                >
                  {text.upload(String(summary.startable))}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <span className="fu-sr-only" role="status">
        {announcement}
      </span>
    </div>
  );
}
