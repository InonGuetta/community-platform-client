import { defineConfig } from "@playwright/test";

// The end-to-end test (PRD NFR-9): one journey through the real app — the
// browser, the API and the database — that no unit test can stand in for.
//
//   npm run e2e        (from community-platform-client/)
//
// It drives the app as it runs on this machine and starts nothing itself:
// the API (:3001) and Vite (:5173) must already be up — see the run-server and
// run-client skills. global-setup says so plainly if they are not.
//
// It runs in the Chrome installed on the machine (`channel: "chrome"`), so no
// browser download is needed. For a machine without Chrome, run
// `npx playwright install chromium` and remove `channel`.
//
// Its data is its own: a throwaway admin per run, and accounts named
// e2e-<who>-<run>@example.test, all deleted afterwards — see
// community-platform-server/scripts/e2eFixtures.js.
export default defineConfig({
  testDir: "e2e",
  // One journey, in order, against one shared database.
  workers: 1,
  fullyParallel: false,
  // Real requests to a remote database, a real upload and real page loads.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.js",
  globalTeardown: "./e2e/global-teardown.js",
  use: {
    baseURL: "http://localhost:5173",
    channel: "chrome",
    locale: "he-IL",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
  },
});
