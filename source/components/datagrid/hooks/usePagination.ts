import { useState, useCallback, useEffect } from "react";

export const usePagination = (
  totalPages: number,
  lazy: boolean,
  dataSource?: any[],
  pageSettings?: { pageNumber: number },
  pageStatus?: ({ currentPage }: { currentPage: number }) => void
) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [pageEnd, setPageEnd] = useState(10);
  const [prevDataLength, setPrevDataLength] = useState(0);

  // Update page range based on current page
  const updatePageRange = useCallback(
    (page: number) => {
      const start = Math.floor(page / 10) * 10;
      setPageStart(start);
      setPageEnd(Math.min(start + 10, totalPages));
    },
    [totalPages]
  );

  // Initialize page range based on total pages
  useEffect(() => {
    if (!lazy) {
      setPageEnd(Math.min(10, totalPages));
    } else {
      setPageEnd(Math.min(pageStart + 10, totalPages));
    }
  }, [totalPages, lazy, pageStart]);

  // Update page status if provided
  useEffect(() => {
    if (pageStatus) {
      pageStatus({ currentPage });
    }
  }, [currentPage, pageStatus]);

  // This will handle the case when dataSource changes
  // and adjust the current page accordingly in managed workflow
  useEffect(() => {
    setPrevDataLength(dataSource?.length || 0);
  }, [dataSource?.length]);

  // Defensive check: if current page is out of bounds due to totalPages shrinking, reset to 0
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(0);
      updatePageRange(0);
    }
  }, [totalPages, currentPage, updatePageRange]);

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
    const newTotalPages =
      lazy && pageSettings?.totalCount
        ? Math.ceil(pageSettings.totalCount / pageSettings.pageNumber)
        : Math.ceil((dataSource?.length || 0) / (pageSettings?.pageNumber || 10));

    setCurrentPage(0);
    setPageStart(0);
    setPageEnd(Math.min(10, newTotalPages));
    return newTotalPages;
  }, [lazy]);

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
