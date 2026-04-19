
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
