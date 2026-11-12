import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { RUN_FILE } from "./fixtures.js";

// The journey the platform exists for (PRD NFR-9), end to end through the real
// screens, API and database:
//
//   a lecturer signs up → an admin approves them → they open a course →
//   a student signs up → the lecturer enrols them → uploads and publishes a
//   lesson in the course → the student finds it in their course and opens it.
//
// Three people, three browser contexts — three separate sessions, as three
// devices would be. Everything they create is deleted by global-teardown.

const run = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));

const person = (who, name) => ({
  name: `${name} ${run.runId}`,
  email: `e2e-${who}-${run.runId}@example.test`,
  // Made here, for this run; the account is deleted with the run.
  password: randomBytes(12).toString("base64url"),
});

// A two-second WAV of a quiet tone: a real file the upload measures and stores.
const wav = (seconds = 2) => {
  const rate = 8000;
  const n = rate * seconds;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) buf.writeInt16LE(Math.round(Math.sin(i / 8) * 2000), 44 + i * 2);
  return buf;
};

const signUp = async (page, who, roleLabel) => {
  await page.goto("/sign-up");
  if (roleLabel) await page.getByRole("button", { name: roleLabel, exact: true }).click();
  await page.getByLabel("שם תצוגה").fill(who.name);
  await page.getByLabel("אימייל").fill(who.email);
  await page.getByLabel(/^סיסמה/).fill(who.password);
  await page.getByRole("button", { name: "הרשמה", exact: true }).click();
  await expect(page).toHaveURL(/\/archive/);
};

const signIn = async (page, who) => {
  await page.goto("/sign-in");
  await page.getByLabel("אימייל").fill(who.email);
  await page.getByLabel(/^סיסמה/).fill(who.password);
  await page.getByRole("button", { name: "התחברות", exact: true }).click();
  await expect(page).toHaveURL(/\/archive/);
};

// The innermost element that holds both this text and this control — a row,
// not the whole list it sits in. Elements are in document order, ancestors
// first, so the last match is the deepest.
const rowWith = (page, text, control) =>
  page.locator("div, li, tr").filter({ hasText: text }).filter({ has: control }).last();

test("a lecturer is approved, opens a course, enrols a student, and the student opens the lesson", async ({ browser }) => {
  const lecturer = person("lecturer", "מרצה בדיקה");
  const student = person("student", "תלמיד בדיקה");
  const admin = run.admin;
  const courseTitle = `קורס בדיקה ${run.runId}`;
  const lessonTitle = `שיעור בדיקה ${run.runId}`;

  const asLecturer = await (await browser.newContext()).newPage();
  const asAdmin = await (await browser.newContext()).newPage();
  const asStudent = await (await browser.newContext()).newPage();

  await test.step("the lecturer signs up, asking to be a lecturer", async () => {
    await signUp(asLecturer, lecturer, "מרצה");
  });

  await test.step("an admin approves the request", async () => {
    await signIn(asAdmin, { email: admin.email, password: admin.password });
    await asAdmin.goto("/users");
    // Only this run's lecturer — other people may be waiting in a real queue.
    const approve = asAdmin.getByRole("button", { name: "אישור", exact: true });
    await rowWith(asAdmin, lecturer.email, approve).getByRole("button", { name: "אישור", exact: true }).click();
    await expect(asAdmin.getByText(lecturer.email)).toHaveCount(1);
  });

  await test.step("the lecturer, now approved, opens a course", async () => {
    await asLecturer.goto("/courses");
    await asLecturer.getByRole("button", { name: "קורס חדש" }).first().click();
    await asLecturer.getByLabel("שם הקורס").fill(courseTitle);
    await asLecturer.getByRole("button", { name: "שמירה" }).click();
    await expect(asLecturer.getByText(courseTitle)).toBeVisible();
  });

  await test.step("a student signs up", async () => {
    await signUp(asStudent, student);
  });

  await test.step("the lecturer enrols the student", async () => {
    await asLecturer.getByText(courseTitle).click();
    const search = asLecturer.getByLabel("חיפוש משתמש להוספה לקורס");
    await search.fill(student.name);
    await asLecturer.getByRole("option", { name: student.name }).click();
    await asLecturer.getByRole("button", { name: "הוספה", exact: true }).click();
    await expect(asLecturer.getByText(`1 תלמידים`)).toBeVisible();
  });

  await test.step("the lecturer uploads a lesson into the course and publishes it", async () => {
    await asLecturer.goto("/archive");
    await asLecturer.getByRole("button", { name: "העלאת מדיה" }).click();
    const dialog = asLecturer.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({ name: "e2e.wav", mimeType: "audio/wav", buffer: wav() });
    await dialog.getByLabel("כותרת").fill(lessonTitle);
    await dialog.getByLabel("שיוך לקורס").click();
    await asLecturer.getByRole("option", { name: courseTitle }).click();
    await dialog.getByRole("button", { name: "העלאה", exact: true }).click();
    // Untagged, so the app offers tags; this journey is not about tags.
    await asLecturer.getByRole("button", { name: "דלג" }).click();

    const card = rowWith(asLecturer, lessonTitle, asLecturer.getByRole("button", { name: "פרסום לתלמידים" }));
    await card.getByRole("button", { name: "פרסום לתלמידים" }).click();
    await expect(asLecturer.getByText("הפריט פורסם ומוצג לתלמידים")).toBeVisible();
  });

  await test.step("the student finds the lesson in their course and opens it", async () => {
    await asStudent.goto("/my-courses");
    await asStudent.getByText(courseTitle).click();
    await expect(asStudent).toHaveURL(/\/my-courses\/\d+/);
    await expect(asStudent.getByText("0 מתוך 1 שיעורים הושלמו")).toBeVisible();
    await asStudent.getByRole("button", { name: lessonTitle, exact: true }).click();
    await expect(asStudent).toHaveURL(/\/media\/\d+/);
    await expect(asStudent.getByRole("heading", { name: lessonTitle })).toBeVisible();
  });

  // PRD COM-3b, COM-4: the lecturer opens the lesson to anyone with the link,
  // and somebody with no account at all follows it.
  await test.step("the lecturer makes the lesson public, and a guest opens the shared link", async () => {
    const lessonId = asStudent.url().match(/\/media\/(\d+)/)[1];
    await asLecturer.goto(`/media/${lessonId}`);
    await asLecturer.getByRole("button", { name: "שיתוף", exact: true }).click();
    await asLecturer.getByRole("checkbox", { name: /קישור ציבורי/ }).click();
    await expect(asLecturer.getByText("השיעור פתוח עכשיו לכל מי שיש לו את הקישור")).toBeVisible();

    const guestContext = await browser.newContext();
    const shareUrl = `http://localhost:5173/api/public/share/${lessonId}`;
    // What WhatsApp reads: tags in the HTML, no JavaScript.
    const preview = await (await guestContext.request.get(shareUrl)).text();
    expect(preview).toContain(`<meta property="og:title" content="${lessonTitle}`);

    const guest = await guestContext.newPage();
    await guest.goto(shareUrl);
    await expect(guest).toHaveURL(new RegExp(`/l/${lessonId}$`));
    await expect(guest.getByRole("heading", { name: lessonTitle })).toBeVisible();
    await expect(guest.getByRole("link", { name: "הצטרפות לקהילה" })).toBeVisible();
    // The recording itself plays for a guest: the browser reads its length.
    await expect
      .poll(() => guest.locator("audio").evaluate((a) => a.duration), { timeout: 15_000 })
      .toBeGreaterThan(1);
  });
});
