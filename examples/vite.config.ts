import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const examplesRoot = fileURLToPath(new URL("./", import.meta.url));
const packageRoot = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig({
  root: examplesRoot,
  plugins: [react()],
  server: {
    open: true,
    fs: {
      allow: [packageRoot],
    },
  },
  build: {
    outDir: fileURLToPath(new URL("../dist-example", import.meta.url)),
    emptyOutDir: true,
  },
});
