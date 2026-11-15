// The callbacks given to page.evaluate run in the page, not in node.
/* global document */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { RUN_FILE } from "./fixtures.js";

// The interface's language, end to end (docs/i18n-plan.md): a guest picks
// English and the whole page turns left to right; a signed-in account keeps
// the choice on the server (users.locale), so it survives a reload; the drawer
// follows, opening from the side a line ends on. Hebrew puts it all back.
//
// Controls are found by what they are, not by their words — the globe by its
// icon, the hamburger by aria-expanded — so the test keeps working as the
// interface's strings are translated.

const run = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));
const student = {
  name: `תלמיד שפה ${run.runId}`,
  email: `e2e-language-${run.runId}@example.test`,
  password: randomBytes(12).toString("base64url"),
};

const globe = (page) => page.locator('button[aria-haspopup="menu"]:has(svg[data-testid="LanguageIcon"])').first();
const choose = async (page, name) => {
  await globe(page).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
};
const htmlDir = (page) => page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
const accountLocale = (page) =>
  page.evaluate(async () => (await (await fetch("/api/auth/me", { credentials: "include" })).json()).locale);

const HAMBURGER = 'header button[aria-expanded]:has(svg[data-testid="MenuIcon"])';

// Where the open drawer's panel sits: hugging the left edge or the right.
const drawerSide = async (page) => {
  await page.locator(HAMBURGER).click();
  const paper = page.locator(".MuiDrawer-paper");
  await expect(paper).toBeVisible();
  // Measured once the slide-in has finished: two readings 100ms apart agree.
  let box = await paper.boundingBox();
  await expect
    .poll(async () => {
      const previous = box;
      await page.waitForTimeout(100);
      box = await paper.boundingBox();
      return previous.x === box.x;
    })
    .toBe(true);
  const width = page.viewportSize().width;
  await page.locator(HAMBURGER).click();
  await expect(paper).toBeHidden();
  if (box.x < 2) return "left";
  if (Math.abs(box.x + box.width - width) < 20) return "right";
  return `neither (${Math.round(box.x)}–${Math.round(box.x + box.width)} of ${width})`;
};

test("the interface changes language and direction, and the account remembers it", async ({ page }) => {
  await test.step("a guest picks English on the sign-in page", async () => {
    await page.goto("/sign-in");
    expect(await htmlDir(page)).toEqual(["he", "rtl"]);
    await choose(page, "English");
    expect(await htmlDir(page)).toEqual(["en", "ltr"]);
    await choose(page, "עברית");
    expect(await htmlDir(page)).toEqual(["he", "rtl"]);
  });

  await test.step("a new account starts in the language it signed up in", async () => {
    await page.goto("/sign-up");
    await page.getByLabel("שם תצוגה").fill(student.name);
    await page.getByLabel("אימייל").fill(student.email);
    await page.getByLabel(/^סיסמה/).fill(student.password);
    await page.getByRole("button", { name: "הרשמה", exact: true }).click();
    await expect(page).toHaveURL(/\/archive/);
    expect(await accountLocale(page)).toBe("he");
    expect(await drawerSide(page)).toBe("left");
  });

  await test.step("choosing English signed in saves it, and it survives a reload", async () => {
    await choose(page, "English");
    expect(await htmlDir(page)).toEqual(["en", "ltr"]);
    await expect.poll(() => accountLocale(page)).toBe("en");
    expect(await drawerSide(page)).toBe("right");

    await page.evaluate(() => localStorage.removeItem("language"));
    await page.reload();
    await expect.poll(() => htmlDir(page)).toEqual(["en", "ltr"]);
  });

  await test.step("Hebrew puts it all back", async () => {
    await choose(page, "עברית");
    expect(await htmlDir(page)).toEqual(["he", "rtl"]);
    await expect.poll(() => accountLocale(page)).toBe("he");
    expect(await drawerSide(page)).toBe("left");
  });
});
