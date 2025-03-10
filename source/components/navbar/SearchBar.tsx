import React, { useCallback } from "react";
import { SearchBarProps } from "./types";

const SearchBar: React.FC<SearchBarProps> = ({
  variant,
  searchQuery,
  setSearchQuery,
  onSearch,
}) => {
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch) {
        onSearch(searchQuery);
      }
    },
    [searchQuery, onSearch]
  );

  return (
    <form onSubmit={handleSearch} className="relative md:ml-4 mt-3 md:mt-0">
      <input
        type="search"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`
          w-full md:w-auto pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none
          ${
            variant === "dark"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-800"
          }
        `}
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </form>
  );
};

export default SearchBar;
