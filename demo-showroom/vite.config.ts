import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@/components": fileURLToPath(
        new URL("../source/beta-components", import.meta.url),
      ),
    },
  },

  server: {
    fs: {
      allow: [".."],
    },
  },

  test: {
    include: ["../source/**/__tests__/**/*.test.ts"],
  },
});
