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
  fs.writeFileSync(RUN_FILE, JSON.stringify(fixtures("setup")));
}
