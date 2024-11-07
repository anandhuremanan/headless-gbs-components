/**
 * Important!!!!
 * Work In Progress Code
 *
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef, useEffect } from "react";
import { upload, x, circleCheck } from "../icon/iconPaths";
import Icon from "../icon/Icon";
import { GetFileIcon } from "./uploaderIcon";
import AestheticProcessingAnimationWithStyles from "./ProgressAnimation";
import { sendFiles } from "./uploaderService";
import { cloudDownload } from "../icon/iconPaths";
import type { FileUploadProps } from "./types";

export const FileUploader = ({
  showImagePreview = false,
  multiple = false,
  onChange,
  selectedFiles = [],
  accept,
  fileCount = 1,
  disabled = false,
  inputFileSize, // Max file size in MB
  startUpload = false,
  apiURL = "",
  chunk_size = 1024 * 1024,
  uploadedFileIdArray = () => {},
  fileData = [],
}: FileUploadProps) => {
  const [files, setFiles] = useState<any[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [fileCountError, setFileCountError] = useState(false);
  const [fileSizeErrors, setFileSizeErrors] = useState<string[]>([]); // Array for file size errors
  const [isUploading, setIsUploading] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<string | undefined>(
    undefined
  );
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<any>(null);
  const dropZoneRef = useRef<any>(null);

  // Starts uploads to server
  useEffect(() => {
    if (startUpload) {
      // Upload Handler
      const handleUpload = async () => {
        if (files.length > 0) {
          setFileUploadStatus(undefined);
          await sendFiles(
            files,
            chunk_size,
            apiURL,
            ({ uploading, progress, uploadedFileIds }) => {
              setIsUploading(uploading);
              if (progress !== undefined) setProgress(progress);
              // Returns Uploaded File ID's
              if (uploadedFileIds) uploadedFileIdArray(uploadedFileIds);
            }
          );
          setFileUploadStatus("Upload completed");
        } else {
          setFileUploadStatus("No files selected");
        }
      };
      handleUpload();
    }
  }, [startUpload]);

  // For Binding values on edit
  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(multiple ? selectedFiles : [selectedFiles[0]]);
    }
  }, [selectedFiles, multiple]);

  // Adds files to file array
  const handleFileChange = (newFiles: File[]) => {
    let updatedFiles: File[] = multiple
      ? [...files, ...newFiles]
      : [newFiles[0]];

    // Ensure the total number of files doesn't exceed the fileCount limit
    if (updatedFiles.length > fileCount) {
      setFileCountError(true);
      updatedFiles = updatedFiles.slice(0, fileCount); // Limit the number of files to fileCount
    } else {
      setFileCountError(false);
    }

    // File size validation
    const validFiles: any = [];
    const newErrors: string[] = [];

    updatedFiles.forEach((file) => {
      const fileSizeInMB = file.size / 1024 / 1024; // Convert bytes to MB
      if (inputFileSize && fileSizeInMB > inputFileSize) {
        newErrors.push(
          `File ${file.name} exceeds the size limit of ${inputFileSize} MB`
        );
      } else {
        validFiles.push(file);
      }
    });

    // Update state with valid files and set errors for oversized files
    if (validFiles.length > 0) {
      setFiles(validFiles);
      setPreviewUrls({});
      validFiles.forEach((file: any) => {
        if (showImagePreview && file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            setPreviewUrls((prev) => ({
              ...prev,
              [file.name]: reader.result as string,
            }));
          };
          reader.readAsDataURL(file);
        }
      });
      if (onChange) onChange(validFiles);
    }

    // Set file size errors
    setFileSizeErrors(newErrors);
  };

  // Removes the file from file array
  const removeFile = (index: number) => {
    const updatedFiles: any = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviewUrls((prevPreviews) => {
      const { [files[index].name]: _, ...rest } = prevPreviews;
      return rest;
    });

    if (onChange) onChange(updatedFiles);
  };

  // Drag and drop handling
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileChange(multiple ? droppedFiles : [droppedFiles[0]]);
  };

  const handleDownload = (fileId: any, fileName: any) => {
    const downloadUrl = constructDownloadUrl(fileId);
    window.open(downloadUrl, "_blank");
  };

  const constructDownloadUrl = (fileId: any) => {
    const url = new URL("download", apiURL);
    url.searchParams.append("id", fileId);
    return url.href;
  };

  const isImageFile = (fileName: any) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        ref={dropZoneRef}
        className={`flex flex-col items-center border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => fileInputRef.current.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Icon
          dimensions={{ width: "36", height: "36" }}
          elements={upload}
          svgClass={"stroke-gray-400 fill-none dark:stroke-white"}
        />
        <p className="mt-2 text-sm text-gray-500">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-400">
          {multiple
            ? "Supports multiple file uploads"
            : "Single file upload only"}
        </p>

        {/* Shows FileUpload Status Here */}
        {fileUploadStatus && (
          <p className="text-xs mt-2 text-green-500 flex gap-1">
            <Icon
              dimensions={{ width: "16", height: "16" }}
              elements={circleCheck}
              svgClass={"stroke-green-500 fill-none dark:stroke-white"}
            />
            {fileUploadStatus}
          </p>
        )}

        {/* Display file size errors */}
        {fileSizeErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {fileSizeErrors.map((error, index) => (
              <span key={index} className="text-xs text-red-500">
                {error}
                <br />
              </span>
            ))}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
        multiple={multiple}
        accept={accept}
        disabled={disabled}
      />

      {/* Display file count error */}
      {fileCountError && (
        <span className="text-xs text-red-500">
          Maximum file count is set to {fileCount}
        </span>
      )}

      {/* Loading Animation */}
      {isUploading && (
        <AestheticProcessingAnimationWithStyles progressPercentage={progress} />
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file: any, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
            >
              <div className="flex items-center space-x-2">
                <GetFileIcon
                  file={file}
                  showImagePreview={showImagePreview}
                  previewUrls={previewUrls}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <Icon
                  dimensions={{ width: "16", height: "16" }}
                  elements={x}
                  svgClass={"stroke-red-500 fill-none dark:stroke-white"}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {fileData.length > 0 &&
        fileData.map((item: any, index: any) => (
          <div
            key={index}
            className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-2"
          >
            <div className="flex items-center space-x-2">
              {/* <GetFileIcon
                file={item.FileName}
                showImagePreview={showImagePreview}
                previewUrls={previewUrls}
              /> */}
              {isImageFile(item.FileName) && (
                <img
                  src={constructDownloadUrl(item.FileID)}
                  alt={item.FileName}
                  className="mt-2 w-8 h-8 object-cover rounded-lg"
                />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {item.FileName}
                </p>
                <p className="text-xs text-gray-500">
                  {(item.FileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button onClick={() => handleDownload(item.FileID, item.FileName)}>
              <Icon
                dimensions={{ width: "18", height: "18" }}
                elements={cloudDownload}
                svgClass={"stroke-red-500 fill-none dark:stroke-white"}
              />
            </button>
          </div>
        ))}
    </div>
  );
};
