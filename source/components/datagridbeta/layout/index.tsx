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
    activeFilterArray,
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
        getActiveFilters: () => activeFilterArray,
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
      activeFilterArray,
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
