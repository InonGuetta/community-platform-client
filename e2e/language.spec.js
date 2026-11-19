// The callbacks given to page.evaluate run in the page, not in node.
/* global document */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { RUN_FILE } from "./fixtures.js";

// The interface's language, end to end (docs/i18n-plan.md): a guest picks
// English and the whole page turns left to right; a signed-in account keeps
// the choice on the server (users.locale), so it survives a reload; the drawer
// follows, opening from the side a line starts on (D-05). Hebrew puts it all
// back.
//
// Controls are found by what they are, not by their words — the globe by its
// icon, the avatar button by its chevron, the language row by the list it
// opens, the hamburger by aria-expanded — so the test keeps working as the
// interface's strings are translated.
//
// Where the language is chosen (Redesign v4, stage 2): signed out, the globe
// in the minimal header; signed in, "שפת האתר" in the avatar menu.

const run = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));
const student = {
  name: `תלמיד שפה ${run.runId}`,
  email: `e2e-language-${run.runId}@example.test`,
  password: randomBytes(12).toString("base64url"),
};

const globe = (page) => page.locator('button[aria-haspopup="menu"]:has(svg[data-testid="LanguageIcon"])').first();
const AVATAR = 'header button[aria-haspopup="menu"]:has(svg[data-testid="KeyboardArrowDownIcon"])';
const LANGUAGE_ROW = '[role="menu"] [role="menuitem"][aria-haspopup="menu"]';
const choose = async (page, name, { signedIn = false } = {}) => {
  if (signedIn) {
    await page.locator(AVATAR).click();
    await page.locator(LANGUAGE_ROW).click();
  } else {
    await globe(page).click();
  }
  await page.getByRole("menuitem", { name, exact: true }).click();
  // Choosing closes the avatar menu too.
  await expect(page.getByRole("menu")).toHaveCount(0);
};
const htmlDir = (page) => page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
const accountLocale = (page) =>
  page.evaluate(async () => (await (await fetch("/api/auth/me", { credentials: "include" })).json()).locale);

const HAMBURGER = 'header button[aria-expanded]:has(svg[data-testid="MenuIcon"])';

// Where the open drawer's panel sits: hugging the left edge or the right.
// The drawer is the phone's menu — its hamburger is shown below md only — so
// the window is narrowed for the reading: wider than the 400px panel, so its
// two edges cannot both touch the screen's.
const PHONE = { width: 600, height: 900 };
const drawerSide = async (page) => {
  const desktop = page.viewportSize();
  await page.setViewportSize(PHONE);
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
  // A modal panel now, over a backdrop: Escape closes it.
  await page.keyboard.press("Escape");
  await expect(paper).toBeHidden();
  await page.setViewportSize(desktop);
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
    // The profile picture offered to a new account — not this test's business.
    await page.getByRole("dialog").getByRole("button", { name: "אחר כך", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await accountLocale(page)).toBe("he");
    expect(await drawerSide(page)).toBe("right");
  });

  await test.step("choosing English signed in saves it, and it survives a reload", async () => {
    await choose(page, "English", { signedIn: true });
    expect(await htmlDir(page)).toEqual(["en", "ltr"]);
    await expect.poll(() => accountLocale(page)).toBe("en");
    expect(await drawerSide(page)).toBe("left");

    await page.evaluate(() => localStorage.removeItem("language"));
    await page.reload();
    await expect.poll(() => htmlDir(page)).toEqual(["en", "ltr"]);
  });

  await test.step("Hebrew puts it all back", async () => {
    await choose(page, "עברית", { signedIn: true });
    expect(await htmlDir(page)).toEqual(["he", "rtl"]);
    await expect.poll(() => accountLocale(page)).toBe("he");
    expect(await drawerSide(page)).toBe("right");
  });
});
