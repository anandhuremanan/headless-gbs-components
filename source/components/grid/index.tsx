/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * Here We Will Re-Render Grid as a Memoized Component For Better Performance.
 * Extended Documentation for Grid can be found at
 * https://psychedelic-step-e70.notion.site/Data-GRID-by-GBS-R-D-20ff97c899d24bc590215a6196435fa3
 */

import { GridMemoised as GridComponent } from "./Grid";
import React, { memo } from "react";

const Grid = memo(GridComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.dataSource === nextProps.dataSource &&
    prevProps.columns === nextProps.columns &&
    prevProps.pageSettings.pageNumber === nextProps.pageSettings.pageNumber &&
    prevProps.enableSearch === nextProps.enableSearch &&
    prevProps.enablePdfExport === nextProps.enablePdfExport &&
    prevProps.enableExcelExport === nextProps.enableExcelExport
  );
});

export { Grid };
