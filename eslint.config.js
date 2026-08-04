import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["node_modules/**", "dist/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Not used in this codebase, and the new JSX transform makes the import
      // unnecessary.
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",

      // eslint-plugin-react-hooks 7 folds the React Compiler's rule family into
      // "recommended". Most of them stay on — they are silent here and would
      // catch real mistakes — but two fire on correct code and are turned off
      // deliberately rather than worked around.
      //
      // preserve-manual-memoization reports that the compiler cannot preserve
      // `useCallback(..., [dispatch, media?.id])` because it infers `media`
      // instead. Depending on the id rather than the whole object is the more
      // precise choice and is what we want; the complaint only matters to a
      // compiler this project does not use.
      "react-hooks/preserve-manual-memoization": "off",

      // set-state-in-effect flags six places that reset derived state when the
      // thing they describe changes — a new media id, a newly selected note.
      // It is a fair criticism, and the idiomatic answer is to remount via a
      // key rather than to synchronise in an effect. But that restructures four
      // working files, and the UI layer is the one part of this codebase with
      // no test coverage, so it is recorded as debt instead of refactored
      // blind. Revisit alongside component tests, or when adopting the
      // compiler.
      "react-hooks/set-state-in-effect": "off",

      // A hook called conditionally is always a bug, and there should be none.
      "react-hooks/rules-of-hooks": "error",

      // Deliberately a warning, not an error.
      //
      // The obvious way to satisfy this rule — add the missing dependency — is
      // frequently the wrong fix and reintroduces the exact bug the video room
      // was rebuilt to remove: an effect that lists a callback its parent
      // rebuilds every render tears itself down and back up continuously,
      // stopping the camera and dropping the socket each time. The right answer
      // there was the opposite, holding the callback in a ref and removing it
      // from the array. The rule cannot tell those apart, so it points and a
      // human decides. Every deliberate omission below carries a reason.
      "react-hooks/exhaustive-deps": "warn",

      // Matches the server. A bare console.* call ships to production and runs
      // in every visitor's browser, because there is nothing to switch it off
      // with — the level in utilities/logger.js is resolved at build time, so a
      // logger.debug is stripped from the bundle entirely while a console.log
      // is not. This rule is what keeps a line added during debugging from
      // becoming permanent. The exemptions are listed below.
      "no-console": "error",

      // Matches the server: a best-effort operation whose failure is genuinely
      // uninteresting — fetching a saved playback position, say — is written as
      // an empty catch on purpose.
      "no-empty": ["error", { allowEmptyCatch: true }],

      "no-unused-vars": ["error", {
        args: "after-used",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    // Tests import their globals explicitly, but they run under node rather
    // than in a browser.
    files: ["src/**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // logger.js is where console.* is the implementation. ErrorBoundary is the
    // deliberate exception documented in its own componentDidCatch: it is the
    // last line of defence, it must report even if the logger module is part of
    // what failed to load, and it is where a real error-reporting service would
    // be wired in.
    files: [
      "src/utilities/logger.js",
      "src/components/features/ErrorBoundary/ErrorBoundary.jsx",
    ],
    rules: { "no-console": "off" },
  },
];
