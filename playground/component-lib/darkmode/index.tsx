/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from "react";
import Icon from "../icon/Icon";
import { moon, sun } from "../icon/iconPaths";

export const DarkMode = () => {
  const [dark, setDark] = React.useState(false);

  useEffect(() => {
    // Check for user's preference in localStorage or system preference
    const isDarkMode =
      localStorage.getItem("darkMode") === "true" ||
      (!("darkMode" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDarkMode);
    updateDarkMode(isDarkMode);
  }, []);

  const updateDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", isDark.toString());
  };

  const darkModeHandler = () => {
    const newDarkMode = !dark;
    setDark(newDarkMode);
    updateDarkMode(newDarkMode);
  };

  return (
    <button onClick={darkModeHandler}>
      {dark ? (
        <Icon
          elements={sun}
          svgClass={"stroke-gray-500 fill-none dark:stroke-white"}
        />
      ) : (
        <Icon
          elements={moon}
          svgClass={"stroke-black fill-none dark:stroke-white"}
        />
      )}
    </button>
  );
};
