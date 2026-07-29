/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  fileimage,
  filespreadsheet,
  filetext,
  film,
  music,
} from "../icon/iconPaths";
import Icon from "../icon/Icon";

// returns an icon based on the selected file type
export const GetFileIcon = ({ file, showImagePreview, previewUrls }: any) => {
  if (file.type.startsWith("image/"))
    return showImagePreview ? (
      <img
        src={previewUrls[file.name]}
        alt={file.name}
        className="mt-2 w-8 h-8 object-cover rounded-lg"
      />
    ) : (
      <Icon
        dimensions={{ width: "26", height: "26" }}
        elements={fileimage}
        svgClass={"stroke-blue-500 fill-none dark:stroke-white"}
      />
    );
  if (file.type === "application/pdf" || file.type.includes("pdf"))
    return (
      <Icon
        dimensions={{ width: "26", height: "26" }}
        elements={filetext}
        svgClass={"stroke-red-500 fill-none dark:stroke-white"}
      />
    );
  if (file.type.includes("spreadsheet") || file.type.includes("excel"))
    return (
      <Icon
        dimensions={{ width: "26", height: "26" }}
        elements={filespreadsheet}
        svgClass={"stroke-green-500 fill-none dark:stroke-white"}
      />
    );
  if (file.type.startsWith("video/"))
    return (
      <Icon
        dimensions={{ width: "26", height: "26" }}
        elements={film}
        svgClass={"stroke-purple-500 fill-none dark:stroke-white"}
      />
    );
  if (file.type.startsWith("audio/"))
    return (
      <Icon
        dimensions={{ width: "26", height: "26" }}
        elements={music}
        svgClass={"stroke-yellow-500 fill-none dark:stroke-white"}
      />
    );
  return (
    <Icon
      dimensions={{ width: "16", height: "16" }}
      elements={filetext}
      svgClass={"stroke-red-500 fill-none dark:stroke-white"}
    />
  );
};
