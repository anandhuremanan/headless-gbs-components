"use client";

import { DataGrid } from "@/component-lib/datagrid";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { data } from "./constants";
import { Input } from "@/component-lib/input";
import { Select } from "@/component-lib/select";
import { MultiSelect } from "@/component-lib/multiselect";

export default function page() {
  const [gridData, setGridData] = React.useState(data);

  const gridRef = useRef<any>(null);

  const items = [
    { value: "apple", label: "Apple" },
    {
      value: "banana",
      label: "Banana",
    },
    { value: "cherry", label: "Cherry" },
    { value: "date", label: "Date" },
  ];

  // Update specific row data
  const updateRowData = useCallback(
    (rowIndex: number, field: string, value: any) => {
      setGridData((prevData) =>
        prevData.map((item, index) =>
          index === rowIndex ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // Add new row
  const addNewRow = useCallback(() => {
    const newRow = {
      id: Date.now(),
      questionGroup: "",
      maximumMark: "",
      cutOffMark: "",
    };

    setGridData((prevData) => [...prevData, newRow]);
  }, []);

  // Delete row
  const deleteRow = useCallback((rowIndex: number) => {
    setGridData((prevData) =>
      prevData.filter((_, index) => index !== rowIndex)
    );
  }, []);

  const templates = useMemo(() => {
    // Template for Question Group select
    function QuestionGroupTemplate({ rowData, rowIndex }: any) {
      const handleChange = useCallback(
        (selectedValue: any) => {
          updateRowData(rowIndex, "questionGroup", selectedValue);
        },
        [rowIndex]
      );

      return (
        <Select
          key={`questionGroup-${rowData.id || rowIndex}`}
          items={items}
          selectedItem={
            rowData.questionGroup ? rowData.questionGroup : undefined
          }
          onSelect={handleChange}
          showSearch={true}
        />
      );
    }

    function QuestionGroupMultiTemplate({ rowData, rowIndex }: any) {
      const handleChange = useCallback(
        (selectedValue: any) => {
          updateRowData(rowIndex, "questionGroupMultiSelect", selectedValue);
        },
        [rowIndex]
      );

      return (
        <MultiSelect
          key={`questionGroupMulti-${rowData.id || rowIndex}`}
          items={items}
          selectedItems={rowData.questionGroupMultiSelect}
          onSelect={handleChange}
          showSearch={true}
        />
      );
    }

    // Template for Maximum Marks input
    function MaximumMarksTemplate({ rowData, rowIndex }: any) {
      const [value, setValue] = React.useState(rowData.maximumMark || "");

      const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          setValue(e.target.value);
        },
        []
      );

      const handleBlur = useCallback(() => {
        updateRowData(rowIndex, "maximumMark", value);
      }, [value, rowIndex]);

      // Sync with external data changes
      useEffect(() => {
        setValue(rowData.maximumMark || "");
      }, [rowData.maximumMark]);

      return (
        <Input
          key={`maximumMark-${rowData.id || rowIndex}`}
          placeholder="Enter Maximum Mark"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      );
    }

    // Template for Cut Off Marks input
    function CutOffMarksTemplate({ rowData, rowIndex }: any) {
      const [value, setValue] = React.useState(rowData.cutOffMark || "");

      const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          setValue(e.target.value);
        },
        []
      );

      const handleBlur = useCallback(() => {
        updateRowData(rowIndex, "cutOffMark", value);
      }, [value, rowIndex]);

      // Sync with external data changes
      useEffect(() => {
        setValue(rowData.cutOffMark || "");
      }, [rowData.cutOffMark]);

      return (
        <Input
          key={`cutOffMark-${rowData.id || rowIndex}`}
          placeholder="Enter CutOff"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      );
    }

    // Template for Actions (Add/Delete)
    function ActionsTemplate({ rowIndex }: any) {
      const handleDelete = useCallback(() => {
        if (rowIndex === 0) {
          updateRowData(rowIndex, "questionGroup", "");
          updateRowData(rowIndex, "maximumMark", "");
          updateRowData(rowIndex, "cutOffMark", "");
        } else {
          deleteRow(rowIndex);
        }
      }, [rowIndex]);

      return (
        <div className="flex gap-2">
          <button
            onClick={addNewRow}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            title="Add new row"
          >
            +
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            title={rowIndex === 0 ? "Clear this row" : "Delete this row"}
          >
            {rowIndex === 0 ? "✕" : "-"}
          </button>
        </div>
      );
    }

    return {
      QuestionGroupTemplate,
      QuestionGroupMultiTemplate,
      MaximumMarksTemplate,
      CutOffMarksTemplate,
      ActionsTemplate,
    };
  }, [updateRowData, addNewRow, deleteRow]);

  const columns = useMemo(
    () => [
      {
        field: "questionGroup",
        headerText: "Question Group",
        width: 50,
        template: templates.QuestionGroupTemplate,
        freezeColumn: true,
      },
      {
        field: "questionGroupMultiSelect",
        headerText: "Question Group Multi",
        width: 50,
        template: templates.QuestionGroupMultiTemplate,
      },
      {
        field: "maximumMark",
        headerText: "Maximum Mark",
        width: 50,
        template: templates.MaximumMarksTemplate,
      },
      {
        field: "cutOffMark",
        headerText: "Cut Off Mark",
        width: 50,
        template: templates.CutOffMarksTemplate,
      },
      {
        field: "actions",
        headerText: "Actions",
        width: 40,
        template: templates.ActionsTemplate,
      },
    ],
    [templates]
  );

  return (
    <div className="min-h-screen px-4 md:px-50 py-5">
      <DataGrid
        ref={gridRef}
        dataSource={gridData}
        columns={columns}
        pageSettings={{ pageNumber: 2 }}
      />
    </div>
  );
}
