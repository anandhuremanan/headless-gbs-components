import React from "react";
import Icon from "../icon/Icon";
import { cloudDownload, x } from "../icon/iconPaths";
import { GetFileIcon } from "./uploaderIcon";
import type { UploadedFilePreview } from "./types";

export default function UploadedFilePreview({
  files = [],
  UploadedFileData,
  apiURL,
  showImagePreview,
  previewUrls,
  onFileRemove,
  isRemovable,
  removedId,
}: UploadedFilePreview) {
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
    <div>
      {/* Rendering Uploded Local Files */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file: any, index: number) => (
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
                onClick={() => {
                  if (onFileRemove) onFileRemove(index);
                }}
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

      {/* Rendering Uploded Remote Files Preview */}
      {UploadedFileData.length > 0 &&
        UploadedFileData.map((item: any, index: any) => (
          <div
            key={index}
            className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-2"
          >
            <div className="flex items-center space-x-2">
              {isImageFile(item.FileName) ? (
                <img
                  src={constructDownloadUrl(item.FileID)}
                  alt={item.FileName}
                  className="mt-2 w-8 h-8 object-cover rounded-lg"
                />
              ) : (
                <GetFileIcon file={{ type: item.FileName.split(".").pop() }} />
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
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(item.FileID, item.FileName)}
              >
                <Icon
                  dimensions={{ width: "18", height: "18" }}
                  elements={cloudDownload}
                  svgClass={"stroke-blue-800 fill-none dark:stroke-white"}
                />
              </button>
              {isRemovable && (
                <button
                  aria-label="Remove"
                  onClick={() => {
                    if (removedId) removedId(item.FileID);
                  }}
                >
                  <Icon
                    dimensions={{ width: "16", height: "16" }}
                    elements={x}
                    svgClass={"stroke-red-500 fill-none dark:stroke-white"}
                  />
                </button>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
