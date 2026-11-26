import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import i18next from "eslint-plugin-i18next";

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
//
// Two reaches. A spacing or border name (ml, marginLeft, borderTopLeftRadius…)
// means a style wherever it appears, so it is refused anywhere in a component —
// including a style object kept in a constant, which is how MediaActionsBar's
// icon margins slipped past a rule that looked only inside sx. `left`/`right`
// and ms/me/ps/pe are also ordinary data keys, so those are refused inside an
// sx/style attribute or a constant whose name ends in Sx.
const STYLE_SCOPES = ["JSXAttribute[name.name=/^(sx|style)$/]", "VariableDeclarator[id.name=/Sx$/]"];
const inStyle = (inner) => STYLE_SCOPES.map((scope) => `${scope} ${inner}`).join(", ");
const PHYSICAL_SPACING = [
  "ml", "mr", "pl", "pr", "marginLeft", "marginRight", "paddingLeft", "paddingRight",
  "borderLeft", "borderRight", "borderLeftColor", "borderRightColor", "borderLeftWidth", "borderRightWidth",
  "borderLeftStyle", "borderRightStyle", "borderTopLeftRadius", "borderTopRightRadius",
  "borderBottomLeftRadius", "borderBottomRightRadius",
];
const PHYSICAL_MESSAGE = "Physical side in a style: use the logical property (marginInlineStart/End, paddingInlineStart/End, insetInlineStart/End, borderInlineStart/End…) so it is right in both directions. A measured, physical number stays, with an eslint-disable saying so.";
const LOGICAL_ONLY = [
  {
    selector: `Property[key.name=/^(${PHYSICAL_SPACING.join("|")})$/]`,
    message: PHYSICAL_MESSAGE,
  },
  {
    selector: inStyle("Property[key.name=/^(left|right)$/]"),
    message: PHYSICAL_MESSAGE,
  },
  {
    selector: inStyle("Property[key.name=/^(ms|me|ps|pe)$/]"),
    message: "MUI has no ms/me/ps/pe shorthand — the browser drops it silently. Write marginInlineStart/End or paddingInlineStart/End.",
  },
  {
    selector: "Property[key.name=\"textAlign\"][value.value=/^(left|right)$/]",
    message: "textAlign \"start\"/\"end\", so the text sits on the right side in both directions.",
  },
  {
    selector: "JSXAttribute[name.name=\"textAlign\"][value.value=/^(left|right)$/]",
    message: "textAlign=\"start\"/\"end\", so the text sits on the right side in both directions.",
  },
];

export default [
  // design/ holds the redesign's reference material (mockups and the scripts
  // copied out of them, gitignored), not code of the app.
  { ignores: ["node_modules/**", "dist/**", "design/**"] },
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
      // "recommended", and the compiler runs on this code (vite.config.js), so
      // all of them stay on — a component that breaks one is a component the
      // compiler silently leaves unoptimised. That includes
      // preserve-manual-memoization: `useCallback(..., [dispatch, media?.id])`
      // reading `media.id` inside makes the compiler skip the whole hook; read
      // the id into a const first and depend on that. One rule stays off:

      // set-state-in-effect flags six places that reset derived state when the
      // thing they describe changes — a new media id, a newly selected note.
      // It is a fair criticism, and the idiomatic answer is to remount via a
      // key rather than to synchronise in an effect. But that restructures four
      // working files, and the UI layer is the one part of this codebase with
      // no test coverage, so it is recorded as debt instead of refactored
      // blind. Revisit alongside component tests. (The compiler compiles these
      // components regardless: this check is the linter's, not a bail-out.)
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
    // No words written into a component (docs/i18n-plan.md): text a reader
    // sees is a key in src/locales/<lng>/<namespace>.json, rendered through
    // t() or <Trans>, so it changes with the interface language. Text BETWEEN
    // tags is what this catches; punctuation, digits and symbols are not words
    // and pass. Content — a title, a name, a transcript — arrives as a value
    // and is never a literal here. Attribute strings are not checked (they are
    // mostly class names, types and ids); an aria-label goes through t() by
    // review.
    files: ["src/**/*.jsx"],
    ignores: ["src/**/*.test.jsx"],
    plugins: { i18next },
    rules: {
      // `exclude` replaces the plugin's own list, and the plugin builds each
      // entry with no "u" flag — so no \p{…}: spell the non-words out.
      // ALL-CAPS tokens (AI, PDF, CSV) and product names (Word) are names,
      // the same in every language, not sentences.
      "i18next/no-literal-string": [
        "error",
        { mode: "jsx-text-only", words: { exclude: ["[\\s0-9!-/:-@[-`{-~—–·…←→↔•×₪€]+", "[A-Z_-]+", "\\s*Word\\s*"] } },
      ],
    },
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
