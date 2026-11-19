import { test, expect } from "vitest";

// i18next/no-literal-string in eslint.config.js: a word written between tags
// is a word that never changes language. This asks ESLint itself, so the rule
// cannot quietly stop matching — its word filter is a regular expression the
// plugin compiles without the "u" flag, and one written with \p{…} once let
// every literal through while the lint stayed green.

const hits = async (jsx) => {
  const { ESLint } = await import("eslint");
  const code = `import Typography from "@mui/material/Typography";\nexport default function Probe() {\n  return (${jsx});\n}\n`;
  const [result] = await new ESLint().lintText(code, { filePath: "src/components/features/Probe.jsx" });
  return result.messages.filter((m) => m.ruleId === "i18next/no-literal-string").length;
};

test("a word between tags is refused, in any script", async () => {
  expect(await hits("<p>Hello world</p>")).toBe(1);
  expect(await hits("<Typography>שלום עולם</Typography>")).toBe(1);
}, 60000);

test("punctuation, digits, symbols and names in capitals are not words", async () => {
  expect(await hits("<span>— · 12 / ₪</span>")).toBe(0);
  expect(await hits("<span>PDF</span>")).toBe(0);
}, 60000);

test("text through t() is what passes", async () => {
  expect(await hits('<Typography>{t("title")}</Typography>')).toBe(0);
}, 60000);
