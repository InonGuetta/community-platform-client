import { test, expect } from "vitest";

// LOGICAL_ONLY in eslint.config.js: the interface runs in both directions, so a
// style names the side a line starts or ends on, never left or right. This
// asks ESLint itself what it refuses, so the rule cannot quietly stop matching
// (a renamed selector would otherwise pass every file and catch nothing).

const hits = async (body) => {
  const { ESLint } = await import("eslint");
  const code = `import Box from "@mui/material/Box";\n${body}\n`;
  const [result] = await new ESLint().lintText(code, { filePath: "src/components/features/Probe.jsx" });
  return result.messages.filter((m) => m.ruleId === "no-restricted-syntax").length;
};

test("a physical side inside sx is refused; the logical one passes", async () => {
  expect(await hits("export const P = () => <Box sx={{ ml: 1, left: 0 }} />;")).toBe(2);
  expect(await hits("export const P = () => <Box sx={{ marginInlineEnd: 1, insetInlineStart: 0 }} />;")).toBe(0);
}, 60000);

test("a spacing name in a style constant is refused too", async () => {
  expect(await hits('const pill = { "& .MuiButton-endIcon": { mr: 0.75 } };\nexport const P = () => <Box sx={pill} />;')).toBe(1);
  expect(await hits("const cardSx = { right: 6 };\nexport const P = () => <Box sx={cardSx} />;")).toBe(1);
}, 60000);

test("left/right as plain data, outside a style, are not a style", async () => {
  expect(await hits("const frame = { left: 3, right: 9 };\nexport const P = () => <Box data-w={frame.right - frame.left} />;")).toBe(0);
}, 60000);

test("ms/me/ps/pe — which MUI does not have — are refused", async () => {
  expect(await hits("export const P = () => <Box sx={{ ms: 2 }} />;")).toBe(1);
}, 60000);

test("textAlign left/right is refused, start/end passes", async () => {
  expect(await hits('export const P = () => <Box sx={{ textAlign: "right" }} />;')).toBe(1);
  expect(await hits('export const P = () => <Box sx={{ textAlign: "start" }} />;')).toBe(0);
}, 60000);
