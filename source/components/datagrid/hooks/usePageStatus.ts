import { useEffect } from "react";

export const usePageStatus = (
  currentPage: number,
  totalPages: number,
  pageStatus?: (status: any) => void
) => {
  useEffect(() => {
    if (pageStatus) {
      pageStatus({ currentPage, totalPages });
    }
  }, [pageStatus, currentPage, totalPages]);
};
