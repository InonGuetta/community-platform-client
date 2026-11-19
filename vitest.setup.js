// Runs before every test file.
//
// Two jobs, both of which only matter to the tests that render components; the
// logic tests are unaffected and stay in the fast `node` environment.
//
// 1. jest-dom's matchers — `toBeInTheDocument`, `toBeDisabled`. They are worth
//    the dependency because the alternative reads as `expect(x).toBeTruthy()`,
//    which passes just as happily when the query returned the wrong node.
// 2. Unmounting between tests. React Testing Library auto-cleans only when
//    Vitest is running with `globals: true`, and this project deliberately
//    imports `test`/`expect` explicitly instead. Without the hook below, every
//    rendered tree stays in the document and the NEXT file's `getByText` finds
//    two matches and fails with something that reads nothing like the cause.
// 3. The interface's strings, in Hebrew. A component that words itself with
//    t() renders the same Hebrew it did before it was translated, so a test
//    that looks for Hebrew text keeps working. A test may switch language
//    freely: the second afterEach below puts Hebrew back.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import i18n from "./src/i18n/i18n";

afterEach(cleanup);
afterEach(async () => {
  if (i18n.language !== "he") await i18n.changeLanguage("he");
});
