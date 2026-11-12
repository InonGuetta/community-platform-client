import fs from "node:fs";
import { fixtures, RUN_FILE } from "./fixtures.js";

// After the journey, passed or failed: everything this run made is deleted —
// its admin, the lecturer and student it signed up, their course and upload —
// and the file holding the admin's password with it.
export default async function globalTeardown() {
  if (!fs.existsSync(RUN_FILE)) return;
  const { runId } = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));
  try {
    const removed = fixtures("teardown", runId);
    process.stdout.write(`e2e cleanup: ${JSON.stringify(removed)}\n`);
  } finally {
    fs.rmSync(RUN_FILE, { force: true });
  }
}
