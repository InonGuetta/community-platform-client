import { execFileSync } from "node:child_process";
import path from "node:path";

// The server's fixture script (community-platform-server/scripts/e2eFixtures.js),
// run from its own directory so it reads the server's .env and database.

// __dirname, not import.meta: Playwright loads these files as CommonJS, since
// this package is not "type": "module".
const here = __dirname;
export const SERVER_DIR = path.resolve(here, "../../community-platform-server");

// This run's id and its throwaway admin. Kept in a file the test reads and
// teardown deletes; it is git-ignored, and it holds a password that is valid
// only until the run's teardown removes the account.
export const RUN_FILE = path.join(here, ".run.json");

export const fixtures = (...args) =>
  JSON.parse(
    execFileSync(process.execPath, ["scripts/e2eFixtures.js", ...args], {
      cwd: SERVER_DIR,
      env: { ...process.env, LOG_LEVEL: "error" },
      encoding: "utf8",
    }).trim().split("\n").pop()
  );
