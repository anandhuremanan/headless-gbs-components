import React from "react";
import Icon from "../../icon/Icon";
import {
  leftArrow,
  leftArrows,
  rightArrow,
  rightArrows,
} from "../../icon/iconPaths";
import { useGridContext } from "../context/GridContext";

const Pagination = () => {
  const {
    currentPage,
    pageStart,
    pageEnd,
    totalPages,
    goToFirstPage,
    prevPage,
    goToPage,
    nextPage,
    goToEndPage,
    workingDataSource,
    lazy,
    pageSettings,
    showTotalPages,
  } = useGridContext();

  return (
    <div className="w-full flex flex-wrap justify-between items-center text-xs px-2 py-4 bg-zinc-100 dark:bg-zinc-900 gap-2 md:gap-4">
      <div className="flex text-xs">
        Showing {currentPage + 1} of {totalPages} pages
        {showTotalPages && (
          <span className="pl-1">
            ({lazy ? pageSettings?.totalCount : workingDataSource.length} items)
          </span>
        )}
      </div>

      <div className="flex space-x-1">
        <button onClick={goToFirstPage} disabled={currentPage === 0}>
          <Icon
            elements={leftArrows}
            svgClass={`${
              currentPage === 0
                ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-not-allowed"
                : "stroke-black fill-none dark:stroke-white cursor-pointer"
            }`}
            dimensions={{ width: 18, height: 18 }}
          />
        </button>
        <button onClick={prevPage} disabled={currentPage === 0}>
          <Icon
            elements={leftArrow}
            svgClass={`${
              currentPage === 0
                ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-not-allowed"
                : "stroke-black fill-none dark:stroke-white cursor-pointer"
            }`}
            dimensions={{ width: 18, height: 18 }}
          />
        </button>
        {pageStart > 0 && (
          <button
            className="p-1 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer"
            onClick={() => goToPage(pageStart - 1)}
          >
            ...
          </button>
        )}
        <div className="flex md:space-x-1">
          {totalPages > 0 &&
            Array.from({ length: pageEnd - pageStart }, (_, i) => (
              <button
                key={pageStart + i}
                onClick={() => goToPage(pageStart + i)}
                className={`hidden md:block px-2 py-1 text-sm rounded-md transition-colors duration-200 ease-in-out ${
                  currentPage === pageStart + i
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600"
                }`}
              >
                {pageStart + i + 1}
              </button>
            ))}
        </div>
        {pageEnd < totalPages && (
          <button onClick={() => goToPage(pageEnd)} className="cursor-pointer">
            ...
          </button>
        )}
        <button onClick={nextPage} disabled={currentPage === totalPages - 1}>
          <Icon
            elements={rightArrow}
            svgClass={`${
              currentPage === totalPages - 1 || workingDataSource.length <= 0
                ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-not-allowed"
                : "stroke-black fill-none dark:stroke-white cursor-pointer"
            }`}
            dimensions={{ width: 18, height: 18 }}
          />
        </button>
        <button onClick={goToEndPage} disabled={currentPage === totalPages - 1}>
          <Icon
            elements={rightArrows}
            svgClass={`${
              currentPage === totalPages - 1 || workingDataSource.length <= 0
                ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-not-allowed"
                : "stroke-black fill-none dark:stroke-white cursor-pointer"
            }`}
            dimensions={{ width: 18, height: 18 }}
          />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
