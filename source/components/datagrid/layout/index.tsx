/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * Extended Documentation for Grid can be found at
 * https://psychedelic-step-e70.notion.site/Data-GRID-by-GBS-R-D-20ff97c899d24bc590215a6196435fa3
 */

"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import type { GridProps } from "../type";
import Pagination from "./GridPagination";
import GridBody from "./GridBody";
import GridToolbar from "./GridToolbar";
import { GridProvider, useGridContext } from "../context/GridContext";

// Main Grid component that uses context
export const GridMemoised = forwardRef((props: GridProps, ref) => {
  return (
    <GridProvider props={props}>
      <GridContent ref={ref} />
    </GridProvider>
  );
});

// Internal component that uses context
const GridContent = forwardRef((_, ref) => {
  const {
    gridContainerClass,
    handleSearch,
    handleApplyFilter,
    clearFilter,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToEndPage,
  } = useGridContext();

  // Making Grid Functions Accessible in Parent
  useImperativeHandle(
    ref,
    () => {
      return {
        goToPage,
        nextPage,
        prevPage,
        goToFirstPage,
        goToEndPage,
        handleSearch,
        handleApplyFilter,
        clearFilter,
      };
    },
    [
      goToPage,
      nextPage,
      prevPage,
      goToFirstPage,
      goToEndPage,
      handleSearch,
      handleApplyFilter,
      clearFilter,
    ]
  );

  return (
    <div className={gridContainerClass}>
      <GridToolbar />
      <GridBody />
      <Pagination />
    </div>
  );
});
