function processFiles(files: File[], chunkSize: number) {
  const finalFiles: { file: Blob; originalFile: File }[] = [];

  files.forEach((file) => {
    if (file.size > chunkSize) {
      let offset = 0;
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        finalFiles.push({ file: chunk, originalFile: file });
        offset += chunkSize;
      }
    } else {
      finalFiles.push({ file, originalFile: file });
    }
  });

  return finalFiles;
}

export async function sendFiles(
  files: File[],
  chunkSize: number,
  apiUrl = "http://localhost:8080/upload",
  isUploading = (status: {
    uploading: boolean;
    progress?: number;
    file?: string;
    uploadedFileIds?: string[];
  }) => {}
) {
  const processedFiles = processFiles(files, chunkSize);

  // Track how many chunks belong to the current file being processed
  const fileChunkCounts: { [key: string]: number } = {};
  files.forEach((file) => {
    fileChunkCounts[file.name] = Math.ceil(file.size / chunkSize);
  });

  // To track chunk index per file
  const chunkIndexTracker: { [key: string]: number } = {};

  let totalChunks = processedFiles.length;
  let uploadedChunks = 0;
  const uploadedFileIds: string[] = [];

  for (let i = 0; i < processedFiles.length; i++) {
    const { file, originalFile } = processedFiles[i];
    const formData = new FormData();
    formData.append("file", file, originalFile.name);
    formData.append("originalname", originalFile.name);
    formData.append("originalFileSize", originalFile.size.toString());

    const chunkCount = fileChunkCounts[originalFile.name];
    const isChunked = chunkCount > 1;

    // Initialize or reset chunkIndex per file
    if (!chunkIndexTracker[originalFile.name]) {
      chunkIndexTracker[originalFile.name] = 0; // Start at 0 for each file
    }

    const chunkIndex = isChunked
      ? chunkIndexTracker[originalFile.name].toString()
      : "";
    formData.append("chunkIndex", chunkIndex);
    formData.append("totalChunks", isChunked ? chunkCount.toString() : "");

    // Increment chunkIndex for the current file
    if (isChunked) {
      chunkIndexTracker[originalFile.name]++;
    }

    try {
      isUploading({
        uploading: true,
        progress: (uploadedChunks / totalChunks) * 100,
        file: originalFile.name,
      });
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.documentId) uploadedFileIds.push(data.documentId);

      uploadedChunks++;
      isUploading({
        uploading: true,
        progress: (uploadedChunks / totalChunks) * 100,
        file: originalFile.name,
      });
    } catch (error) {
      console.error("Error uploading file chunk:", error);
      isUploading({
        uploading: false,
        progress: (uploadedChunks / totalChunks) * 100,
        file: originalFile.name,
      });
    }
  }

  // Indicate that the upload is complete
  isUploading({
    uploading: false,
    progress: 100,
    uploadedFileIds: uploadedFileIds,
  });
}

// returns all files
export async function getAllFiles(apiUrl: string) {
  let files: any[] = [];
  return files;
}

// returns files by ID
export async function getFilesById(
  apiUrl: string,
  documentIds: string[]
): Promise<any[]> {
  return Promise.all(
    documentIds.map(async (id) => {
      const response = await fetch(`${apiUrl}?id=${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch document with ID: ${id}`);
      }
      return response.json();
    })
  );
}
