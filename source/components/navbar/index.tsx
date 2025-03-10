/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useCallback, memo } from "react";
import NavItemComponent from "./NavItemComponent";
import SearchBar from "./SearchBar";
import AuthSection from "./AuthSection";
import MobileToggle from "./MobileToggle";
import { NavbarProps } from "./types";
import {
  getContainerClasses,
  getPositionClasses,
  getThemeClasses,
} from "./helperFunctions";

const Navbar: React.FC<NavbarProps> = memo(
  ({
    brand,
    items,
    variant = "light",
    position = "sticky",
    containerType = "contained",
    showSearchBar = false,
    showAuthButtons = false,
    authState = "loggedOut",
    userProfile,
    rightSection,
    leftSection,
    centerSection,
    onSearch,
    onLogin,
    onSignup,
    onLogout,
    onProfileClick,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

    useEffect(() => {
      if (position !== "static") {
        const handleScroll = () => {
          setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
      }
    }, [position]);

    useEffect(() => {
      if (isOpen) {
        const handleClickOutside = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (
            !target.closest(".navbar-menu") &&
            !target.closest(".navbar-toggle")
          ) {
            setIsOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
          document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isOpen]);

    const toggleMenu = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    const toggleSubmenu = useCallback((id: string, e: React.MouseEvent) => {
      e.preventDefault();
      setActiveSubmenu((prev) => (prev === id ? null : id));
    }, []);

    return (
      <nav
        className={`${getThemeClasses(variant)} ${getPositionClasses(
          position
        )} ${scrolled ? "shadow-md" : ""} transition-shadow duration-300`}
      >
        <div
          className={`${getContainerClasses(
            containerType
          )} flex flex-wrap items-center justify-between py-3`}
        >
          <div className="flex items-center flex-shrink-0 mr-6">
            {leftSection || (
              <a href={brand.href} className="flex items-center">
                {brand.logo && <div className="mr-2">{brand.logo}</div>}
                <span className="text-lg font-semibold">{brand.name}</span>
              </a>
            )}
          </div>

          <MobileToggle isOpen={isOpen} toggleMenu={toggleMenu} />

          {centerSection && (
            <div className="hidden md:block flex-grow-0 order-3 md:order-2">
              {centerSection}
            </div>
          )}

          <div
            className={`navbar-menu w-full md:flex md:items-center md:w-auto order-last md:order-3 ${
              isOpen ? "block" : "hidden"
            } md:block`}
          >
            <div className="text-sm md:flex-grow mt-4 md:mt-0">
              <NavItemComponent
                items={items}
                isMobile={!isOpen ? false : true}
                activeSubmenu={activeSubmenu}
                toggleSubmenu={toggleSubmenu}
                variant={variant}
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              {rightSection || (
                <>
                  {showSearchBar && (
                    <SearchBar
                      variant={variant}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      onSearch={onSearch}
                    />
                  )}
                  <AuthSection
                    showAuthButtons={showAuthButtons}
                    authState={authState}
                    userProfile={userProfile}
                    variant={variant}
                    onLogin={onLogin}
                    onSignup={onSignup}
                    onLogout={onLogout}
                    onProfileClick={onProfileClick}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }
);

Navbar.displayName = "Navbar";
export default Navbar;
