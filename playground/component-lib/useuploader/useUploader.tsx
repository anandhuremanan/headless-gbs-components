import { useState, useCallback } from "react";

// Types
interface ChunkInfo {
  file: Blob;
  originalFile: File;
  chunkIndex: number;
  totalChunks: number;
}

interface UploadProgress {
  [fileName: string]: number;
}

interface UploadResult {
  fileName: string;
  status: "complete" | "chunk_received" | "error";
  message?: string;
}

interface UseChunkedUploadOptions {
  chunkSize?: number;
  maxConcurrentUploads?: number;
  baseUrl?: string;
  onProgress?: (fileName: string, progress: number) => void;
  onComplete?: (fileName: string, result: UploadResult) => void;
  onError?: (fileName: string, error: Error) => void;
  additionalParams?: any;
}

interface UseChunkedUploadReturn {
  uploadFiles: (files: File[], customParams?: any) => Promise<void>;
  isUploading: boolean;
  uploadProgress: UploadProgress;
  uploadStatus: string;
  cancelUpload: () => void;
  reset: () => void;
}

// Helper function to process files into chunks
function processFiles(files: File[], chunkSize: number): ChunkInfo[] {
  const finalFiles: ChunkInfo[] = [];

  files.forEach((file) => {
    if (file.size > chunkSize) {
      const totalChunks = Math.ceil(file.size / chunkSize);
      let offset = 0;
      let chunkIndex = 0;

      while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        finalFiles.push({
          file: chunk,
          originalFile: file,
          chunkIndex,
          totalChunks,
        });
        offset += chunkSize;
        chunkIndex++;
      }
    } else {
      finalFiles.push({
        file,
        originalFile: file,
        chunkIndex: 0,
        totalChunks: 1,
      });
    }
  });

  return finalFiles;
}

// Helper function to upload a single chunk
async function uploadChunk(
  chunk: Blob,
  originalFile: File,
  chunkIndex: number,
  totalChunks: number,
  baseUrl: string,
  signal?: AbortSignal,
  additionalParams: any = {}
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("chunk", chunk);
  formData.append("fileName", originalFile.name);
  formData.append("chunkIndex", chunkIndex.toString());
  formData.append("totalChunks", totalChunks.toString());
  formData.append("fileSize", originalFile.size.toString());
  formData.append(
    "additionalParams",
    additionalParams ? JSON.stringify(additionalParams) : "{}"
  );

  // If you have additional parameters to send, you can append them here
  // Uncomment the following lines if you want to include additionalParams in the formData

  // Object.entries(additionalParams).forEach(([key, value]: any) => {
  //   formData.append(key, value);
  // });

  const response = await fetch(`${baseUrl}`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

// Main custom hook
export function useChunkedUpload(
  options: UseChunkedUploadOptions = {}
): UseChunkedUploadReturn {
  const {
    chunkSize = 1024 * 1024, // 1MB default
    maxConcurrentUploads = 3,
    baseUrl = "",
    onProgress,
    onComplete,
    onError,
    additionalParams = {},
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [uploadStatus, setUploadStatus] = useState("");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const updateProgress = useCallback(
    (fileName: string, progress: number) => {
      setUploadProgress((prev) => ({
        ...prev,
        [fileName]: progress,
      }));
      onProgress?.(fileName, progress);
    },
    [onProgress]
  );

  const updateStatus = useCallback((status: string) => {
    setUploadStatus(status);
  }, []);

  const uploadFiles = useCallback(
    async (files: File[], customParams?: any) => {
      if (files.length === 0) {
        throw new Error("No files selected for upload.");
      }

      // Create new abort controller
      const controller = new AbortController();
      setAbortController(controller);

      setIsUploading(true);
      updateStatus("Processing files...");

      try {
        const processedFiles = processFiles(files, chunkSize);

        // Group chunks by file
        const fileChunks: { [key: string]: ChunkInfo[] } = {};
        processedFiles.forEach((processedFile) => {
          const fileName = processedFile.originalFile.name;
          if (!fileChunks[fileName]) {
            fileChunks[fileName] = [];
          }
          fileChunks[fileName].push(processedFile);
        });

        // Upload files with concurrency control
        const fileNames = Object.keys(fileChunks);
        const uploadPromises = fileNames.map(async (fileName) => {
          const chunks = fileChunks[fileName];
          updateStatus(`Uploading ${fileName}...`);

          try {
            // Create semaphore for concurrent chunk uploads
            const semaphore = new Array(maxConcurrentUploads).fill(null);
            let chunkIndex = 0;
            const results: UploadResult[] = [];

            const uploadNextChunk = async (): Promise<void> => {
              if (chunkIndex >= chunks.length) return;

              const currentChunk = chunks[chunkIndex++];
              const result = await uploadChunk(
                currentChunk.file,
                currentChunk.originalFile,
                currentChunk.chunkIndex,
                currentChunk.totalChunks,
                baseUrl,
                controller.signal,
                { ...additionalParams, ...customParams }
              );

              results.push(result);

              // Update progress
              const progress = (results.length / chunks.length) * 100;
              updateProgress(fileName, progress);

              // Continue uploading if there are more chunks
              if (chunkIndex < chunks.length) {
                await uploadNextChunk();
              }
            };

            // Start concurrent uploads
            await Promise.all(semaphore.map(() => uploadNextChunk()));

            // Check if file is complete
            const completeResult = results.find((r) => r.status === "complete");
            if (completeResult) {
              updateStatus(`${fileName} uploaded successfully!`);
              onComplete?.(fileName, completeResult);
            }

            return { fileName, success: true };
          } catch (error) {
            const errorObj =
              error instanceof Error ? error : new Error(String(error));
            updateStatus(`Failed to upload ${fileName}: ${errorObj.message}`);
            onError?.(fileName, errorObj);
            return { fileName, success: false, error: errorObj };
          }
        });

        const results = await Promise.all(uploadPromises);

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.length - successCount;

        if (failCount === 0) {
          updateStatus("All files uploaded successfully!");
        } else if (successCount === 0) {
          updateStatus("All uploads failed!");
        } else {
          updateStatus(`${successCount} files uploaded, ${failCount} failed`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          updateStatus("Upload cancelled");
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          updateStatus(`Upload failed: ${errorMessage}`);
        }
      } finally {
        setIsUploading(false);
        setAbortController(null);
      }
    },
    [
      chunkSize,
      maxConcurrentUploads,
      baseUrl,
      updateProgress,
      updateStatus,
      onComplete,
      onError,
    ]
  );

  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      updateStatus("Cancelling upload...");
    }
  }, [abortController, updateStatus]);

  const reset = useCallback(() => {
    setUploadProgress({});
    setUploadStatus("");
    setIsUploading(false);
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    uploadStatus,
    cancelUpload,
    reset,
  };
}

// Alternative hook with simplified API for basic use cases
export function useSimpleUpload(baseUrl?: string) {
  const { uploadFiles, isUploading, uploadStatus } = useChunkedUpload({
    baseUrl,
    chunkSize: 1024 * 1024, // 1MB
    maxConcurrentUploads: 3,
  });

  return {
    upload: uploadFiles,
    isUploading,
    status: uploadStatus,
  };
}
