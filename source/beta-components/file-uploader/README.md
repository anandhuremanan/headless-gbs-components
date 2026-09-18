# FileUploader

Drop, browse or paste files and upload them in resumable chunks — styled to
match the DataGrid, Combobox, DatePicker and Toaster. No runtime dependencies
besides React 19.

- Chunked uploads with per-file progress, pause, resume, retry and cancel.
- Parallel files, automatic retries with backoff, per-chunk abort.
- Validation (type, size, count, duplicates, custom) with readable reasons.
- Image previews that you can turn off, and files already on the server.
- Works with a plain form: without an endpoint, the files post with the form.
- Keyboard, screen reader, dark mode and right-to-left support.

## Setup

```ts
import { FileUploader } from "@/components/file-uploader";
import "@/components/file-uploader/styles.css";
```

## Basic usage

```tsx
<FileUploader
  label="Attachments"
  multiple
  accept=".pdf,image/*"
  maxSize={20 * 1024 * 1024}
  endpoint="/api/upload"
  onUploadComplete={(items) => console.log(items.map((item) => item.response))}
/>
```

Files are uploaded when the user presses **Upload**, when you call
`ref.current.upload()`, or right away with `autoUpload`.

## Upload protocol

Each chunk is a `multipart/form-data` POST with these fields (rename any with
`fieldNames`; the defaults match the Go `chunk-uploader` package):

| Field | Value |
| --- | --- |
| `uploadId` | Same for every chunk of one upload; group chunks by it. |
| `fileName` | Original file name. |
| `chunkIndex` | 0-based. Small files are sent as chunk `0` of `1`. |
| `totalChunks` | Number of chunks. |
| `fileSize` | Size of the whole file in bytes. |
| `additionalParams` | JSON from `params`, when given. |
| `chunk` | The bytes. |

Chunks of one file are sent in order, one at a time. Answer each with a 2xx; the
body of the last answer is kept as `item.response` (JSON is parsed). 5xx, 408,
429 and network errors are retried with backoff; other 4xx fail the file.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `multiple` | `boolean` | `false` | Several files; otherwise a new file replaces the current one. |
| `accept` | `string` | — | `.pdf`, `image/*`, MIME types. |
| `maxFiles` / `maxSize` / `minSize` | `number` | — | Count, and bytes per file. |
| `validate` | `(file) => string \| null` | — | Return a message to reject. |
| `allowDuplicates` | `boolean` | `false` | Allow the same file twice (name, size and date). |
| `endpoint` | `string \| (request) => string` | — | Where chunks go. |
| `method`, `headers`, `withCredentials` | — | `POST` | Request options; `headers` may be an async function. |
| `params` | `object \| (file) => object` | — | Sent as `additionalParams`. |
| `fieldNames` | `Partial<ChunkFieldNames>` | Go names | Rename form fields. |
| `parseResponse` | `(body, xhr) => unknown` | JSON, else text | Custom response parsing. |
| `transport` | `(request) => Promise` | HTTP | Replace the sender entirely. |
| `chunkSize` | `number` | 5 MiB | Bytes per request. |
| `concurrency` | `number` | `3` | Files uploading at once. |
| `retries` / `retryDelay` | `number` | `3` / `1000` | Attempts per chunk; delay doubles each time. |
| `autoUpload` | `boolean` | `false` | Upload as soon as files are added. |
| `preview` | `boolean` | `true` | Image thumbnails. |
| `existingFiles` | `ExistingFile[]` | — | Files already stored, with download links. |
| `onRemoveExisting` | `(file) => void` | — | Shows a remove button on existing files. |
| `removable` | `boolean` | `true` | Remove buttons. |
| `name` | `string` | — | Form field. With an endpoint, stored ids post; without, the files do. |
| `getFileId` | `(item) => string` | from response | The id posted for an uploaded file. |
| `label`, `description`, `error`, `required`, `disabled`, `size`, `locale` | — | — | Field and display options. |
| `className`, `classNames`, `style`, `localeText` | — | — | Slots: `root`, `label`, `dropzone`, `rejections`, `list`, `item`, `thumb`, `progress`, `actions`, `footer`. |
| `onChange`, `onRejected`, `onFileSuccess`, `onFileError`, `onUploadComplete` | — | — | Events. |
| `ref` | `Ref<FileUploaderHandle>` | — | `open`, `addFiles`, `upload`, `pause`, `cancel`, `clear`, `getFiles`, `getItems`. |

## Headless use

`useFileUploader(config)` returns `{ store, items, rejections }` for a custom UI.
The framework-free core — `createUploaderStore`, `createHttpTransport`,
`buildChunkForm`, `partitionFiles`, `matchesAccept`, `formatBytes`, `summarize` —
has no React imports.

## Known limits

- Chunks of one file are sequential; parallelism is across files.
- Pausing aborts the chunk in flight and sends it again on resume.
- Progress lives in memory: reloading the page loses it (the server may still
  hold the chunks under the `uploadId`).
- Dropped folders are not expanded.
