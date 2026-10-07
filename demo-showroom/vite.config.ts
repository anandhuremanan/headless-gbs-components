import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { askEndpoint } from "./ask-endpoint.js";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // The demo's own model endpoint, so the API key never reaches the bundle.
    askEndpoint(),
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

  build: {
    rollupOptions: {
      input: {
        // The showroom itself.
        index: fileURLToPath(new URL("index.html", import.meta.url)),
        /*
         * The WebMCP verification page. Built as well as served in dev, so the
         * real-Chrome driver can be pointed at a production bundle rather than
         * only at the dev server.
         */
        webmcp: fileURLToPath(new URL("webmcp.html", import.meta.url)),
      },
    },
  },

  server: {
    fs: {
      allow: [".."],
    },
  },

  test: {
    include: [
      "../source/**/__tests__/**/*.test.ts",
      "../tools/**/__tests__/**/*.test.ts",
      /*
       * The WebMCP projection itself now lives in the library, with unit tests
       * under `source/`. What stays here is the integration test that drives a
       * real DataGrid through the registered tool.
       */
      "./src/**/__tests__/**/*.test.ts",
    ],
  },
});
