import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "tinyClient",
      fileName: (format) => `tiny-client.${format}.js`,
    },
  },
});
