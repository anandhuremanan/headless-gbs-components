import { useState, useCallback, useEffect } from "react";
import { getSourceData } from "../../utils";

export const useDataSource = (
  dataSource: any,
  pageSettings: any,
  lazy: boolean
) => {
  const [workingDataSource, setWorkingDataSource] = useState<any>([]);
  const [fallbackSourceData, setFallbackSourceData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const getGridData = useCallback(async () => {
    try {
      const sourceData = await getSourceData(dataSource);
      const gridData = sourceData.sourcedata;
      setFallbackSourceData(gridData);
      setWorkingDataSource(gridData);
      const totalPages = Math.ceil(gridData.length / pageSettings.pageNumber);
      setTotalPages(totalPages);
      return totalPages;
    } catch (error) {
      console.error("Error fetching grid source data:", error);
      return 0;
    }
  }, [dataSource, pageSettings.pageNumber]);

  useEffect(() => {
    const handleDataSource = async () => {
      if (Array.isArray(dataSource)) {
        setWorkingDataSource(dataSource);

        const totalPages =
          lazy && pageSettings.totalCount
            ? Math.ceil(pageSettings.totalCount / pageSettings.pageNumber)
            : Math.ceil(dataSource.length / pageSettings.pageNumber);

        setTotalPages(totalPages);
      } else if (typeof dataSource === "string") {
        await getGridData();
      }
    };

    handleDataSource();
  }, [dataSource, pageSettings, lazy, getGridData]);

  return {
    workingDataSource,
    setWorkingDataSource,
    fallbackSourceData,
    totalPages,
    setTotalPages,
  };
};
