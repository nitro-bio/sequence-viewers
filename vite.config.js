/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import alias from "@rollup/plugin-alias";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    react(),
    alias({
      entries: [
        {
          find: "@utils",
          replacement: path.resolve(__dirname, "./src/utils"),
        },
        {
          find: "@Ariadne",
          replacement: path.resolve(__dirname, "./src/components/Ariadne"),
        },
        {
          find: "@ui",
          replacement: path.resolve(__dirname, "./src/components/ui"),
        },
      ],
    }),
  ],
  build: {
    sourcemap: "inline",
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Nitro UI",
      formats: ["es"],
      fileName: (format) => `nitro-sequence-viewers.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom", "styled-components"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "styled-components": "styled",
        },
        interop: "compat",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./setupTests.ts"],
    env: {
      mode: "test",
      baseUrl: "http://localhost:6006",
    },
  },
});
