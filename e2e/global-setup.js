import fs from "node:fs";
import { fixtures, RUN_FILE } from "./fixtures.js";

// Before the journey: the app must be running, and this run gets its admin.
const reachable = async (url) => {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
};

export default async function globalSetup() {
  // Any answer will do — /api/courses answers 401 to a stranger, and that is
  // the API saying it is up.
  if (!(await reachable("http://localhost:3001/api/courses"))) {
    throw new Error("The API is not running on :3001 — start it with `npm run dev` in community-platform-server.");
  }
  if (!(await reachable("http://localhost:5173/"))) {
    throw new Error("Vite is not running on :5173 — start it with `npm run dev` in community-platform-client.");
  }
  // One request through Vite's proxy before the journey starts. Twice, the
  // first run after a long idle failed its very first POST (the lecturer's
  // sign-up) with the proxy's "cannot reach the API", while the API answered
  // directly — most likely a stale keep-alive socket between proxy and API. A
  // sign-up is deliberately never retried by the app, so the test warms the
  // path instead. Dev only: production has no Vite proxy.
  await reachable("http://localhost:5173/api/courses");
  fs.writeFileSync(RUN_FILE, JSON.stringify(fixtures("setup")));
}
