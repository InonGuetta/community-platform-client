import { test, expect } from "vitest";
import { isLeakedCreator } from "./creatorPage";

test("the pipeline's own default names are leaks, a person's name is not", () => {
  expect(isLeakedCreator("AI")).toBe(true);
  expect(isLeakedCreator(" ToolLLM ")).toBe(true);
  expect(isLeakedCreator("הרב כהן")).toBe(false);
  expect(isLeakedCreator("")).toBe(false);
  expect(isLeakedCreator(null)).toBe(false);
});
