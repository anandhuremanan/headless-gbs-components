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
    // The library is imported from outside this package, so its bare `react`
    // imports cannot reach demo-showroom/node_modules by directory walking.
    // `dedupe` resolves them from the Vite root, and keeps a single copy.
    dedupe: ["react", "react-dom"],

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
