import React from "react";
import { AuthSectionProps } from "./types";

const AuthSection: React.FC<AuthSectionProps> = ({
  showAuthButtons,
  authState,
  userProfile,
  variant,
  onLogin,
  onSignup,
  onLogout,
  onProfileClick,
}) => {
  if (!showAuthButtons) return null;

  if (authState === "loggedIn" && userProfile) {
    return (
      <div className="ml-4 relative">
        <button
          onClick={onProfileClick}
          className="flex items-center text-sm focus:outline-none"
        >
          {userProfile.avatar ? (
            <img
              className="h-8 w-8 rounded-full"
              src={userProfile.avatar}
              alt={userProfile.name}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="ml-2 hidden md:block">{userProfile.name}</span>
          <svg
            className="ml-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden">
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Your Profile
          </a>
          <a
            href="/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </a>
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:ml-4 mt-4 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
      <button
        onClick={onLogin}
        className={`
          px-4 py-2 text-sm font-medium rounded-md
          ${
            variant === "dark"
              ? "text-white hover:bg-gray-700"
              : "text-blue-600 hover:bg-blue-50"
          }
        `}
      >
        Log in
      </button>
      <button
        onClick={onSignup}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Sign up
      </button>
    </div>
  );
};

export default AuthSection;
