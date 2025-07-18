import { useState, useCallback, useEffect } from "react";

export const usePagination = (
  totalPages: number,
  lazy: boolean,
  dataSource?: any[],
  pageSettings?: { pageNumber: number }
) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [pageEnd, setPageEnd] = useState(10);
  const [prevDataLength, setPrevDataLength] = useState(0);

  const updatePageRange = useCallback(
    (page: number) => {
      const start = Math.floor(page / 10) * 10;
      setPageStart(start);
      setPageEnd(Math.min(start + 10, totalPages));
    },
    [totalPages]
  );

  useEffect(() => {
    if (!lazy) {
      setPageEnd(Math.min(10, totalPages));
    } else {
      setPageEnd(Math.min(pageStart + 10, totalPages));
    }
  }, [totalPages, lazy, pageStart]);

  // This will handle the case when dataSource changes
  // and adjust the current page accordingly in managed workflow
  useEffect(() => {
    if (lazy && dataSource && prevDataLength > 0) {
      const currentDataLength = dataSource.length;

      if (currentDataLength > prevDataLength) {
        const lastPage = totalPages - 1;
        setCurrentPage(lastPage);
        updatePageRange(lastPage);
      } else if (currentDataLength < prevDataLength) {
        const rowsPerPage = lazy ? 1 : pageSettings?.pageNumber || 10;
        const startIndex = currentPage * rowsPerPage;

        if (startIndex >= currentDataLength && currentPage > 0) {
          const newPage = currentPage - 1;
          setCurrentPage(newPage);
          updatePageRange(newPage);
        }
      }
    }
    setPrevDataLength(dataSource?.length || 0);
  }, [
    dataSource?.length,
    totalPages,
    updatePageRange,
    prevDataLength,
    currentPage,
    lazy,
  ]);

  const nextPage = useCallback(() => {
    setCurrentPage((prevPage) => {
      if (prevPage < totalPages - 1) {
        const newPage = prevPage + 1;
        updatePageRange(newPage);
        return newPage;
      }
      return prevPage;
    });
  }, [totalPages, updatePageRange]);

  const prevPage = useCallback(() => {
    setCurrentPage((prevPage) => {
      if (prevPage > 0) {
        const newPage = prevPage - 1;
        updatePageRange(newPage);
        return newPage;
      }
      return prevPage;
    });
  }, [updatePageRange]);

  const goToEndPage = useCallback(() => {
    const lastPage = totalPages - 1;
    setCurrentPage(lastPage);
    updatePageRange(lastPage);
  }, [totalPages, updatePageRange]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(0);
    updatePageRange(0);
  }, [updatePageRange]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      updatePageRange(page);
    },
    [updatePageRange]
  );

  const resetPage = useCallback((dataSource: any, pageSettings: any) => {
    const newTotalPages = Math.ceil(
      dataSource.length / pageSettings.pageNumber
    );
    setCurrentPage(0);
    setPageStart(0);
    setPageEnd(Math.min(10, newTotalPages));
    return newTotalPages;
  }, []);

  return {
    currentPage,
    pageStart,
    pageEnd,
    nextPage,
    prevPage,
    goToEndPage,
    goToFirstPage,
    goToPage,
    resetPage,
    updatePageRange,
  };
};
