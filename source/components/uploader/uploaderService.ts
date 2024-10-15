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

// Converts large files to chunks to send over network and sends
export async function sendFiles(
  files: File[],
  chunkSize: number,
  apiUrl = "http://localhost:8080/upload"
) {
  const processedFiles = processFiles(files, chunkSize);
  const totalChunks = processedFiles.length;

  for (let i = 0; i < processedFiles.length; i++) {
    const { file, originalFile } = processedFiles[i];
    const formData = new FormData();
    formData.append("file", file, originalFile.name);
    formData.append("originalname", originalFile.name);

    if (file.size > chunkSize) {
      formData.append("chunkIndex", i.toString());
      formData.append("totalChunks", totalChunks.toString());
    } else {
      formData.append("chunkIndex", "0");
      formData.append("totalChunks", "1");
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.documentId) {
        console.log(
          `File uploaded successfully. Document ID: ${data.documentId}`
        );
      } else {
        console.log(`Chunk ${i + 1}/${totalChunks} uploaded`);
      }
    } catch (error) {
      console.error("Error uploading file chunk:", error);
    }
  }
}
