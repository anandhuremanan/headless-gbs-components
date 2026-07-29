/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { useLocation } from "@grampro/headless-helpers";
import Icon from "../icon/Icon";
import { rightArrow } from "../icon/iconPaths";
import type { BreadcrumbsProps } from "./types";

export const Breadcrumb = ({
  showHome = true,
  rootPath = "/",
  homeLabel = "Home",
  transformLabel,
  className = "",
  activeLinkClass = "font-medium text-gray-900 dark:text-white",
  inactiveLinkClass = "text-gray-500 hover:text-gray-700",
}: BreadcrumbsProps) => {
  const { pathSegments } = useLocation({
    showHome,
    rootPath,
    homeLabel,
    transformLabel,
  });

  if (pathSegments.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center">
        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          return (
            <li key={index} className="flex items-center">
              <>
                <a
                  href={segment.path}
                  className={isLast ? activeLinkClass : inactiveLinkClass}
                >
                  {segment.label}
                </a>
                {!isLast && (
                  <span className="mx-2 text-gray-400">
                    <Icon
                      elements={rightArrow}
                      dimensions={{ width: 14, height: 14 }}
                      svgClass={
                        "stroke-black fill-none dark:stroke-white cursor-pointer"
                      }
                    />
                  </span>
                )}
              </>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
