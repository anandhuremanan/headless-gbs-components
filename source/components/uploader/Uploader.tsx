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
}: any) => {
  const [files, setFiles] = useState<any[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<any>(null);

  console.log(files);

  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
    }
  }, [selectedFiles]);

  // adds files to file array
  const handleFileChange = (e: any) => {
    const selectedFiles = Array.from(e.target.files);
    const newPreviewUrls = { ...previewUrls };

    selectedFiles.forEach((file: any) => {
      if (showImagePreview && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          newPreviewUrls[file.name] = reader.result as string;
          setPreviewUrls(newPreviewUrls);
        };
        reader.readAsDataURL(file);
      }
    });

    const updatedFiles = [...files, ...selectedFiles];
    setFiles(updatedFiles);

    if (onChange) onChange(updatedFiles);
  };

  // remove file from the file array
  const removeFile = (index: any) => {
    const fileToRemove = files[index];
    const updatedFiles = files.filter((_, i) => i !== index);

    setFiles(updatedFiles);
    setPreviewUrls((prevPreviews) => {
      const { [fileToRemove.name]: _, ...rest } = prevPreviews;
      return rest;
    });

    if (onChange) onChange(updatedFiles);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="flex flex-col items-center border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => fileInputRef.current.click()}
      >
        <Icon
          dimensions={{ width: "36", height: "36" }}
          elements={upload}
          svgClass={"stroke-gray-400 fill-none dark:stroke-white"}
        />
        <p className="mt-2 text-sm text-gray-500">
          Click to upload or drag and drop
        </p>
        {multiple && (
          <p className="text-xs text-gray-400">
            Supports multiple file uploads
          </p>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple={multiple}
      />

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
