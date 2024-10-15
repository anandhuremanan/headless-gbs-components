/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef, useEffect } from "react";
import { upload, x } from "../../icon/iconPaths";
import Icon from "../../icon/Icon";
import { GetFileIcon } from "./uploaderIcon";
import AestheticProcessingAnimationWithStyles from "./ProgressAnimation";

export const FileUploader = ({
  showImagePreview = false,
  multiple = true,
  onChange,
  startsUpload = false,
  selectedFiles = [],
  accept,
  fileCount,
}: any) => {
  const [files, setFiles] = useState<any[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [fileCountError, setFileCountError] = useState(false);
  const fileInputRef = useRef<any>(null);
  const dropZoneRef = useRef<any>(null);

  // For Binding values on edit
  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(multiple ? selectedFiles : [selectedFiles[0]]);
    }
  }, [selectedFiles, multiple]);

  // Shows Error when filecount is higher
  useEffect(() => {
    if (files.length > fileCount) {
      setFileCountError(true);
    }
  }, [files, fileCount]);

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

    setFiles(updatedFiles);

    // Clear previous preview URLs if not multiple
    if (!multiple) {
      setPreviewUrls({});
    }

    newFiles.forEach((file) => {
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

    if (onChange) onChange(updatedFiles);
  };

  // Removes the file from file array
  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviewUrls((prevPreviews) => {
      const { [files[index].name]: _, ...rest } = prevPreviews;
      return rest;
    });

    if (onChange) onChange(updatedFiles);
  };

  // *** Code to handle Drag and drop functionalities Starts here
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
  // Code to handle Drag and drop functionalities Ends here ***

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
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
        multiple={multiple}
        accept={accept}
      />

      {fileCountError && (
        <span className="text-xs text-red-500">
          Maximum file count is set to {fileCount}
        </span>
      )}

      {startsUpload && <AestheticProcessingAnimationWithStyles />}

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
    </div>
  );
};
