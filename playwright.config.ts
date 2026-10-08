import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// Browser tests run the real app on a throwaway database, with a stub in place of Jev.
export default defineConfig({
  testDir: "e2e",
  workers: 1, // one shared database, so tests run one at a time
  // Phone width only: every test shares one database, so a second viewport would start from the first one's leftovers.
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: `rm -f e2e.db e2e.db-* && npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: {
      TURSO_DATABASE_URL: "file:e2e.db",
      TURSO_AUTH_TOKEN: "",
      ADMIN_PASSWORD: "e2e-password",
      TYPESAFE_API_KEY: "unused-with-fake-jev",
      E2E_FAKE_JEV: "1",
    },
  },
});
