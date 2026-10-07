import { fileURLToPath } from "node:url";

/*
 * Serves the probe only. Deliberately not part of demo-showroom: the probe
 * imports `@huggingface/transformers` and pulls half a gigabyte of weights,
 * and neither belongs anywhere near the showroom's dev server.
 *
 * It does import the real agent from `source/`, because the point of the
 * validator step is that the browser reaches the *production* validator rather
 * than a copy of it.
 *
 * No `defineConfig` import: this directory is outside the package that owns
 * node_modules, so `vite` is not resolvable from here even though the binary
 * is. A plain object is the same thing without the import.
 */
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

export default {
  root: fileURLToPath(new URL(".", import.meta.url)),

  server: {
    port: 5190,
    strictPort: true,
    // localhost is a secure context, which WebGPU requires.
    host: "127.0.0.1",
    fs: { allow: [repoRoot] },
    headers: {
      // Not needed for WebGPU itself, but Transformers.js wants them for the
      // threaded WASM path, and their absence muddies a failure.
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },

  optimizeDeps: {
    // Pre-bundling the ONNX runtime is slow and pointless for one page.
    exclude: ["@huggingface/transformers"],
  },
};
