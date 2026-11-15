import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// ── Direction: logical properties only (docs/i18n-plan.md) ──────────────────
//
// The interface runs right-to-left in Hebrew and Yiddish and left-to-right in
// English, French and Spanish, with no stylis flip plugin (see theme.js). So a
// style must name the side a line STARTS or ENDS on, never left or right — one
// declaration is then right in both directions.
//
// Note what MUI does and does not offer: marginInlineStart/End and
// paddingInlineStart/End are spacing keys (`marginInlineStart: 2` is 16px);
// there are NO `ms`/`me`/`ps`/`pe` shorthands — MUI passes them through as
// unknown CSS and the browser drops them, silently. Positions are
// insetInlineStart/End (`insetInline: 0` for both); text is textAlign
// "start"/"end".
//
// A number measured from the page (getBoundingClientRect, a drag) IS physical,
// and stays `left` with an eslint-disable comment saying so.
const STYLE = "JSXAttribute[name.name=/^(sx|style)$/]";
const PHYSICAL = [
  "ml", "mr", "pl", "pr", "marginLeft", "marginRight", "paddingLeft", "paddingRight", "left", "right",
  "borderLeft", "borderRight", "borderLeftColor", "borderRightColor", "borderLeftWidth", "borderRightWidth",
  "borderLeftStyle", "borderRightStyle", "borderTopLeftRadius", "borderTopRightRadius",
  "borderBottomLeftRadius", "borderBottomRightRadius",
];
const LOGICAL_ONLY = [
  {
    selector: `${STYLE} Property[key.name=/^(${PHYSICAL.join("|")})$/]`,
    message: "Physical side in a style: use the logical property (marginInlineStart/End, paddingInlineStart/End, insetInlineStart/End, borderInlineStart/End…) so it is right in both directions. A measured, physical number stays, with an eslint-disable saying so.",
  },
  {
    selector: `${STYLE} Property[key.name=/^(ms|me|ps|pe)$/]`,
    message: "MUI has no ms/me/ps/pe shorthand — the browser drops it silently. Write marginInlineStart/End or paddingInlineStart/End.",
  },
  {
    selector: `${STYLE} Property[key.name="textAlign"][value.value=/^(left|right)$/]`,
    message: "textAlign \"start\"/\"end\", so the text sits on the right side in both directions.",
  },
  {
    selector: "JSXAttribute[name.name=\"textAlign\"][value.value=/^(left|right)$/]",
    message: "textAlign=\"start\"/\"end\", so the text sits on the right side in both directions.",
  },
];

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
    // Where state lives (CLAUDE.md, CONTRIBUTING): a component renders what its
    // hook hands it. Dispatching and selecting belong in the hook — the page's
    // useXxxPageController, or a useXxx beside the component — so a component
    // reads as layout and its logic is tested without it.
    //
    // The four exceptions are the shell that wires the store in: the Provider,
    // the routes that read who is signed in, and the snackbar that shows what
    // the store queued. Tests render with a Provider of their own.
    files: ["src/**/*.jsx"],
    ignores: [
      "src/**/*.test.jsx",
      "src/main.jsx",
      "src/App.jsx",
      "src/components/pages/auth/ProtectedRoute.jsx",
      "src/components/features/Notification/GlobalSnackbar.jsx",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "react-redux",
          message: "A .jsx renders what its hook returns: move the dispatch/select into a useXxx.js beside it (CLAUDE.md, \"Where state lives\").",
        }],
      }],
    },
  },
  {
    // Logical properties only — see LOGICAL_ONLY above. Every component; a
    // style object in a .js file (theme.js, navStyles.js) is outside its
    // reach, and theme.js's physical zeroes are deliberate (see there).
    files: ["src/**/*.jsx"],
    ignores: ["src/**/*.test.jsx"],
    rules: { "no-restricted-syntax": ["error", ...LOGICAL_ONLY] },
  },
  {
    // Tests import their globals explicitly, but they run under node rather
    // than in a browser.
    files: ["src/**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Build-time scripts run under node, not in the page (generate-icons.mjs
    // draws the app's icons, PRD MOB-1), and report to the terminal.
    files: ["scripts/**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },
  {
    // The end-to-end test and its config (PRD NFR-9) run under node and drive a
    // browser from the outside; they report to the terminal.
    files: ["e2e/**/*.js", "playwright.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },
  {
    // The service worker (PRD MOB-2): a plain script in the worker's own scope,
    // where `self`, `caches` and `clients` are the globals and there is no
    // window.
    files: ["public/sw.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: { ...globals.serviceworker } },
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
