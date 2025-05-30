import { useState, useEffect, useCallback } from "react";
import {
  exportToExcelHelper,
  exportToPDFHelper,
} from "@grampro/headless-helpers";

export const usePaginatedData = (
  apiEndpoint: string,
  initialPageSize = 10,
  method: "GET" | "POST" = "GET",
  columns: any[] = [],
  additionalParams: any = {}
) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    pageSize: initialPageSize,
  });

  const fetchData = useCallback(
    async (
      method: "GET" | "POST",
      page: number,
      pageSize: number,
      currentFilters: any[] = [],
      search = "",
      isExportCall: boolean | null = null,
      exportType: string | null = null
    ) => {
      try {
        setLoading(true);

        let response;

        if (method === "POST") {
          response = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              page: page + 1,
              pageSize,
              filters: currentFilters,
              search,
              additionalParams,
              isExportCall,
            }),
          });
        } else {
          let url = `${apiEndpoint}?page=${page + 1}&pageSize=${pageSize}`;
          if (currentFilters.length > 0) {
            url += `&filters=${encodeURIComponent(
              JSON.stringify(currentFilters)
            )}`;
          }
          if (search) {
            url += `&search=${encodeURIComponent(search)}`;
          }
          if (isExportCall) {
            url += `&isExportCall=${encodeURIComponent(true)}`;
          }

          response = await fetch(url);
        }

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const result = await response.json();

        if (!isExportCall) {
          setData(result.data);
          setPagination((prev) => ({
            ...prev,
            currentPage: page,
            totalPages: result.pagination.totalPages,
            totalCount: result.pagination.totalItems,
          }));
        } else {
          if (exportType == "excelExport") {
            exportToExcelHelper(
              result.data,
              columns.length > 0 ? columns : [],
              "excel-export-data"
            );
          } else if (exportType == "pdfExport") {
            exportToPDFHelper(
              result.data,
              columns.length > 0 ? columns : [],
              "pdf-export-data",
              { layout: "portrait", paperSize: "a4" }
            );
          }
        }
      } catch (error) {
        console.error(`Failed to fetch data (${method}):`, error);
      } finally {
        setLoading(false);
      }
    },
    [apiEndpoint]
  );

  // Handle page changes
  const handlePageChange = useCallback(
    (status: { currentPage: number; totalPages: number }) => {
      if (status.currentPage !== pagination.currentPage) {
        fetchData(method, status.currentPage, pagination.pageSize, filters);
      }
    },
    [fetchData, pagination.currentPage, pagination.pageSize, filters]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: any[]) => {
      const filterType = newFilters.map((f: any) => ({ ...f, type: "filter" }));
      setFilters(filterType);
      fetchData(method, 0, pagination.pageSize, filterType);
    },
    [fetchData, pagination.pageSize]
  );

  // Handle search input
  const handleSearch = useCallback(
    (searchTerm: string) => {
      const existingSearch = filters.find(
        (f) => f.type === "search" && f.value === searchTerm
      );

      if (existingSearch) return;

      const updatedFilters = filters.filter((f) => f.type !== "search");

      const finalFilters = [
        ...updatedFilters,
        { type: "search", value: searchTerm },
      ];

      setFilters(finalFilters);
      fetchData(method, 0, pagination.pageSize, finalFilters);
    },
    [fetchData, pagination.pageSize, filters]
  );

  // Handle exports
  const handleExports = useCallback(
    (exportType: string) => {
      fetchData(method, 0, pagination.pageSize, [], "", true, exportType);
    },
    [fetchData, method, pagination.pageSize]
  );

  useEffect(() => {
    fetchData(method, 0, pagination.pageSize, filters);
  }, [fetchData, pagination.pageSize]);

  return {
    data,
    loading,
    pagination,
    filters,
    handlePageChange,
    handleFilterChange,
    refetch: () =>
      fetchData(method, pagination.currentPage, pagination.pageSize, filters),
    handleSearch,
    handleExports,
  };
};
