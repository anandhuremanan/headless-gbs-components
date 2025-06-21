import { useState, useCallback } from "react";

interface UseSearchProps {
  workingDataSource: any[];
  setWorkingDataSource: (data: any[]) => void;
  fallbackSourceData: any[];
  dataSource: any;
  lazy: boolean;
  pageSettings: any;
  resetPage: (data: any[], settings: any) => number;
  setTotalPages: (pages: number) => void;
  searchParamValue?: (value: string) => void;
}

export const useSearch = ({
  workingDataSource,
  setWorkingDataSource,
  fallbackSourceData,
  dataSource,
  lazy,
  pageSettings,
  resetPage,
  setTotalPages,
  searchParamValue,
}: UseSearchProps) => {
  const [searchParam, setSearchParam] = useState("");

  const handleSearchInput = useCallback(
    (e: any) => {
      const searchValue = e.target.value;
      if (searchParamValue) searchParamValue(searchValue);
      setSearchParam(searchValue);

      if (searchValue === "") {
        if (!lazy) {
          const fallback =
            fallbackSourceData.length > 0 ? fallbackSourceData : dataSource;
          setWorkingDataSource(fallback);
          const totalPages = resetPage(fallback, pageSettings);
          setTotalPages(totalPages);
        }
      }
    },
    [
      searchParamValue,
      lazy,
      fallbackSourceData,
      dataSource,
      setWorkingDataSource,
      resetPage,
      pageSettings,
      setTotalPages,
    ]
  );

  const handleSearch = useCallback(
    (searchParam: string) => {
      if (!lazy) {
        const filteredData = workingDataSource.filter((item: any) =>
          Object.values(item).some((val: any) => {
            const trimmedVal = val.toString().toLowerCase().trim();
            const trimmedSearchParam = searchParam.toLowerCase().trim();
            return trimmedVal.includes(trimmedSearchParam);
          })
        );
        setWorkingDataSource(filteredData);
        const totalPages = resetPage(filteredData, pageSettings);
        setTotalPages(totalPages);
      }
    },
    [
      lazy,
      workingDataSource,
      setWorkingDataSource,
      resetPage,
      pageSettings,
      setTotalPages,
    ]
  );

  return {
    searchParam,
    handleSearchInput,
    handleSearch,
  };
};
