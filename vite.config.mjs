/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import alias from "@rollup/plugin-alias";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    react(),
    tailwindcss(),
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
    sourcemap: true,
    minify: "terser",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Nitro UI",
      formats: ["es"],
      fileName: (format) => `nitro-sequence-viewers.${format}.js`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "styled-components",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "styled-components": "styled",
          "@biowasm/aioli": "Aioli",
        },
        interop: "compat",
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
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
