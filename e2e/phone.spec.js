import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { RUN_FILE, fixtures } from "./fixtures.js";

// A phone number and SMS, end to end (PRD AUTH-13): a student adds a number,
// types back the code, turns SMS on for live sessions, and removes the number —
// which turns SMS off again. With no SMS provider configured (the normal state
// of a development machine) the code goes to the server's log; the fixtures
// script puts a known one in its place, for this run's account only.
//
// The number is this run's own, and the fixtures refuse it if any account
// outside the run has it — proving a number another account verified would
// move it here.

const run = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));
const student = {
  name: `תלמיד טלפון ${run.runId}`,
  email: `e2e-phone-${run.runId}@example.test`,
  password: randomBytes(12).toString("base64url"),
};
const { phone } = fixtures("phone", run.runId);
// As an Israeli types it: 054-5xx-xxxx.
const typed = `0${phone.slice(4, 6)}-${phone.slice(6, 9)}-${phone.slice(9)}`;

const smsPreference = async (page, key) =>
  page.evaluate(async (category) => {
    const prefs = await (await fetch("/api/notifications/preferences", { credentials: "include" })).json();
    return { sms: prefs.categories.find((c) => c.key === category)?.sms, phoneVerified: prefs.phoneVerified };
  }, key);

test("a student adds a phone number, verifies it by code, turns SMS on, and removes it", async ({ page }) => {
  await test.step("a new student account, signed in", async () => {
    const res = await page.request.post("/api/auth/register", {
      data: { email: student.email, password: student.password, displayName: student.name, requestedRole: "student", locale: "he" },
    });
    expect(res.ok()).toBe(true);
  });

  await test.step("the number is typed and a code is sent", async () => {
    // Signed up through the API, so no welcome dialog is offered over the page.
    await page.goto("/profile");
    await page.getByLabel("מספר נייד", { exact: true }).fill(typed);
    await page.getByRole("button", { name: "שליחת קוד" }).click();
    await expect(page.getByRole("dialog")).toContainText(typed);
  });

  await test.step("a wrong code is refused with the attempts left; the right one verifies", async () => {
    const field = page.getByRole("dialog").getByLabel("קוד אימות");
    const { code } = fixtures("phone-code", run.runId, student.email);
    const wrong = code === "111111" ? "222222" : "111111";
    await field.fill(wrong);
    await expect(page.getByRole("dialog")).toContainText("נותרו 4");
    await field.fill(code);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText(typed, { exact: true })).toBeVisible();
    await expect(page.getByText("מאומת", { exact: true })).toBeVisible();
  });

  await test.step("SMS is turned on for live sessions", async () => {
    const sessionsSms = page.getByRole("switch", { name: "מפגשים חיים — ב־SMS" });
    await expect(sessionsSms).toBeEnabled();
    await sessionsSms.check();
    await expect.poll(() => smsPreference(page, "sessions")).toEqual({ sms: true, phoneVerified: true });
  });

  await test.step("removing the number turns SMS off with it", async () => {
    await page.getByRole("button", { name: "הסרת המספר" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "הסרת המספר" }).click();
    await expect(page.getByLabel("מספר נייד", { exact: true })).toBeVisible();
    const sessionsSms = page.getByRole("switch", { name: "מפגשים חיים — ב־SMS" });
    await expect(sessionsSms).toBeDisabled();
    await expect(sessionsSms).not.toBeChecked();
    await expect.poll(() => smsPreference(page, "sessions")).toEqual({ sms: false, phoneVerified: false });
  });
});
