/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useState } from "react";
import { twMerge } from "tailwind-merge";
import type { TabsProps } from "./types";

export function Tabs({
  tabs,
  defaultTabId,
  renderContent,
  onChange,
  className = "",
  variant = "line",
}: TabsProps) {
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId || (tabs.length > 0 ? tabs[0].id : "")
  );

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  const isPills = variant === "pills";

  return (
    <div className={twMerge("w-full", className)}>
      <nav
        className={twMerge(
          "flex gap-1",
          isPills
            ? "rounded-lg bg-slate-100 p-1 dark:bg-slate-900"
            : "border-b border-slate-200 dark:border-slate-700"
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              className={twMerge(
                "min-h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:text-slate-300",
                isPills ? "rounded-md" : "-mb-px border-b-2 border-transparent",
                isActive && isPills
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "",
                isActive && !isPills
                  ? "border-sky-600 text-sky-700"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              )}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      <div className="pt-4">{renderContent(activeTabId)}</div>
    </div>
  );
}

