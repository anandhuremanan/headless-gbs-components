// import React from "react";
// import Icon from "../../icon/Icon";
// import {
//   leftArrow,
//   leftArrows,
//   rightArrow,
//   rightArrows,
// } from "../../icon/iconPaths";
// import { PaginationProps } from "../type";

// export default function Pagination({
//   goToFirstPage,
//   currentPage,
//   prevPage,
//   pageStart,
//   goToPage,
//   workingDataSource,
//   pageEnd,
//   totalPages,
//   nextPage,
//   goToEndPage,
// }: PaginationProps) {
//   return (
//     <div className="flex p-2 justify-between dark:text-white text-xs mt-4">
//       <div className="flex gap-4">
//         <button
//           onClick={goToFirstPage}
//           className={`${
//             currentPage === 0
//               ? "text-gray-200 dark:text-gray-700 cursor-pointer"
//               : ""
//           }`}
//         >
//           <Icon
//             elements={leftArrows}
//             svgClass={`${
//               currentPage === 0
//                 ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-pointer"
//                 : "stroke-black fill-none dark:stroke-white cursor-pointer"
//             }`}
//           />
//         </button>
//         <button onClick={prevPage}>
//           <Icon
//             elements={leftArrow}
//             svgClass={`${
//               currentPage === 0
//                 ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-pointer"
//                 : "stroke-black fill-none dark:stroke-white cursor-pointer"
//             }`}
//           />
//         </button>
//         <div className="flex flex-row gap-3 items-center">
//           {pageStart > 0 && (
//             <button
//               className="p-1 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer"
//               onClick={() => goToPage(pageStart - 1)}
//             >
//               ...
//             </button>
//           )}
//           {workingDataSource.length > 0 &&
//             Array.from({ length: pageEnd - pageStart }).map((_, i) => (
//               <button
//                 key={i}
//                 onClick={() => goToPage(pageStart + i)}
//                 className={`${
//                   pageStart + i === currentPage
//                     ? "font-bold text-white p-2 h-6 bg-black flex items-center justify-center rounded-md w-auto dark:bg-white dark:text-black"
//                     : ""
//                 }`}
//               >
//                 {pageStart + i + 1}
//               </button>
//             ))}
//           {pageEnd < totalPages && (
//             <button onClick={() => goToPage(pageEnd)}>...</button>
//           )}
//         </div>
//         <button
//           onClick={nextPage}
//           className={`${
//             currentPage === totalPages - 1 || workingDataSource.length <= 0
//               ? "text-gray-200 dark:text-gray-700 cursor-pointer"
//               : ""
//           }`}
//         >
//           <Icon
//             elements={rightArrow}
//             svgClass={`${
//               currentPage === totalPages - 1 || workingDataSource.length <= 0
//                 ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-pointer"
//                 : "stroke-black fill-none dark:stroke-white cursor-pointer"
//             }`}
//           />
//         </button>
//         <button
//           onClick={goToEndPage}
//           className={`${
//             currentPage === totalPages - 1 || workingDataSource.length <= 0
//               ? "text-gray-200 dark:text-gray-700 cursor-pointer"
//               : ""
//           }`}
//         >
//           <Icon
//             elements={rightArrows}
//             svgClass={`${
//               currentPage === totalPages - 1 || workingDataSource.length <= 0
//                 ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-pointer"
//                 : "stroke-black fill-none dark:stroke-white cursor-pointer"
//             }`}
//           />
//         </button>
//       </div>
//       <div className="flex text-xs">
//         {currentPage + 1} of {totalPages} pages ({workingDataSource.length})
//         items
//       </div>
//     </div>
//   );
// }

import React from "react";
import { useGridPagination } from "../hooks/GridHooks";
import Icon from "../../icon/Icon";
import {
  leftArrow,
  leftArrows,
  rightArrow,
  rightArrows,
} from "../../icon/iconPaths";

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
  } = useGridPagination();

  return (
    <div className="flex flex-wrap justify-between items-center text-xs px-2 py-4 bg-white dark:bg-zinc-900 gap-2 md:gap-4">
      <div className="flex flex-1 space-x-1">
        <button onClick={goToFirstPage} disabled={currentPage === 0}>
          <Icon
            elements={leftArrows}
            svgClass={`${
              currentPage === 0
                ? "stroke-gray-200 fill-none dark:stroke-gray-700 cursor-not-allowed"
                : "stroke-black fill-none dark:stroke-white cursor-pointer"
            }`}
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
          {Array.from({ length: pageEnd - pageStart }, (_, i) => (
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
          />
        </button>
      </div>

      <div className="flex text-xs">
        {currentPage + 1} of {totalPages} pages ({workingDataSource.length})
        items
      </div>
    </div>
  );
};

export default Pagination;
