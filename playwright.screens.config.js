import { defineConfig } from "@playwright/test";

// The screenshot runner (Redesign v4 stage 8a) — NOT part of `npm run e2e`.
//
//   npm run screens        (from community-platform-client/)
//
// Same rules as the e2e: it starts nothing itself (the API on :3001 and Vite on
// :5173 must be up), runs in the installed Chrome, and gets its throwaway admin
// from the same fixtures script and removes it afterwards. Output goes to
// design/qa-shots/ (git-ignored). It never starts transcription, a summary, or
// any OpenAI / Stripe / Twilio call.
export default defineConfig({
  testDir: "e2e/screens",
  workers: 1,
  fullyParallel: false,
  timeout: 1_800_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.js",
  globalTeardown: "./e2e/global-teardown.js",
  use: {
    baseURL: "http://localhost:5173",
    channel: "chrome",
    locale: "he-IL",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
});
