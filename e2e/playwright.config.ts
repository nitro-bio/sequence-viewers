import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1100, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      cwd: resolve(__dirname, ".."),
      command: "node e2e/serve-packed.mjs",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
    {
      cwd: resolve(__dirname, ".."),
      command:
        "npm --prefix .packed-test/examples/vite run preview -- --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
    },
    {
      cwd: resolve(__dirname, ".."),
      command:
        "npm --prefix .packed-test/examples/next run start -- --hostname 127.0.0.1 --port 4175",
      url: "http://127.0.0.1:4175",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
