import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { RUN_FILE } from "./fixtures.js";
import { words, literally } from "./words.js";

// The journey the platform exists for (PRD NFR-9), end to end through the real
// screens, API and database:
//
//   a lecturer signs up → an admin approves them → they open a course →
//   a student signs up → the lecturer enrols them → uploads and publishes a
//   lesson in the course → the student finds it in their course and opens it.
//
// Three people, three browser contexts — three separate sessions, as three
// devices would be. Everything they create is deleted by global-teardown.
//
// The journey runs once per language below (docs/i18n-plan.md, prompt 33):
// every label is found through the locale files (e2e/words.js), each browser
// starts in that language, and Hebrew and Yiddish run right to left, English
// left to right. The names people type stay Hebrew in every run — content
// never changes language.

const run = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));

const person = (who, name, lng) => ({
  name: `${name} ${lng} ${run.runId}`,
  // e2e-<who>-<lng>-<runId>: still matched by teardown's e2e-%-<runId>.
  email: `e2e-${who}-${lng}-${run.runId}@example.test`,
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

const signUp = async (page, w, who, roleLabel) => {
  await page.goto("/sign-up");
  if (roleLabel) await page.getByRole("button", { name: roleLabel, exact: true }).click();
  await page.getByLabel(w("auth:fields.displayName")).fill(who.name);
  await page.getByLabel(w("auth:fields.email")).fill(who.email);
  await page.getByLabel(new RegExp(`^${literally(w("auth:fields.password"))}`)).fill(who.password);
  await page.getByRole("button", { name: w("auth:signUp.submit"), exact: true }).click();
  await expect(page).toHaveURL(/\/archive/);
  // A new account is offered a profile picture once; this journey says later.
  const welcome = page.getByRole("dialog");
  await expect(welcome.getByText(w("profile:avatar.welcome.title", { name: who.name }))).toBeVisible();
  await welcome.getByRole("button", { name: w("profile:avatar.welcome.later"), exact: true }).click();
  await expect(welcome).toBeHidden();
};

const signIn = async (page, w, who) => {
  await page.goto("/sign-in");
  await page.getByLabel(w("auth:fields.email")).fill(who.email);
  await page.getByLabel(new RegExp(`^${literally(w("auth:fields.password"))}`)).fill(who.password);
  await page.getByRole("button", { name: w("auth:signIn.submit"), exact: true }).click();
  await expect(page).toHaveURL(/\/archive/);
};

// A browser that opens in this language, and keeps it through signing in: the
// language is remembered as a visitor's choice (src/i18n/i18n.js), so an
// account that signs in here — the admin's included — takes it on rather than
// switching the page to the account's own language.
const contextIn = async (browser, lng) => {
  const context = await browser.newContext();
  await context.addInitScript((code) => {
    try {
      if (!localStorage.getItem("language")) localStorage.setItem("language", code);
      sessionStorage.setItem("languageChosenSignedOut", code);
    } catch {
      // A page with no storage simply starts in Hebrew.
    }
  }, lng);
  return context;
};

// The innermost element that holds both this text and this control — a row,
// not the whole list it sits in. Elements are in document order, ancestors
// first, so the last match is the deepest.
const rowWith = (page, text, control) =>
  page.locator("div, li, tr").filter({ hasText: text }).filter({ has: control }).last();

for (const lng of ["he", "en", "yi"]) {
test(`[${lng}] a lecturer is approved, opens a course, enrols a student, and the student opens the lesson`, async ({ browser }) => {
  const w = words(lng);
  const direction = lng === "en" ? "ltr" : "rtl";
  const lecturer = person("lecturer", "מרצה בדיקה", lng);
  const student = person("student", "תלמיד בדיקה", lng);
  const admin = run.admin;
  const courseTitle = `קורס בדיקה ${lng} ${run.runId}`;
  const lessonTitle = `שיעור בדיקה ${lng} ${run.runId}`;

  const asLecturer = await (await contextIn(browser, lng)).newPage();
  const asAdmin = await (await contextIn(browser, lng)).newPage();
  const asStudent = await (await contextIn(browser, lng)).newPage();

  await test.step("the lecturer signs up, asking to be a lecturer", async () => {
    await signUp(asLecturer, w, lecturer, w("format:roles.lecturer"));
    await expect(asLecturer.locator("html")).toHaveAttribute("dir", direction);
    await expect(asLecturer.locator("html")).toHaveAttribute("lang", lng);
  });

  await test.step("an admin approves the request", async () => {
    await signIn(asAdmin, w, { email: admin.email, password: admin.password });
    await asAdmin.goto("/users");
    // Only this run's lecturer — other people may be waiting in a real queue.
    const approve = asAdmin.getByRole("button", { name: w("users:pending.approve"), exact: true });
    await rowWith(asAdmin, lecturer.email, approve).getByRole("button", { name: w("users:pending.approve"), exact: true }).click();
    await expect(asAdmin.getByText(lecturer.email)).toHaveCount(1);
  });

  await test.step("the lecturer, now approved, opens a course", async () => {
    await asLecturer.goto("/courses");
    await asLecturer.getByRole("button", { name: w("courses:newCourse") }).first().click();
    await asLecturer.getByLabel(w("courses:form.name")).fill(courseTitle);
    await asLecturer.getByRole("button", { name: w("courses:form.save") }).click();
    await expect(asLecturer.getByText(courseTitle)).toBeVisible();
  });

  await test.step("a student signs up", async () => {
    await signUp(asStudent, w, student);
  });

  await test.step("the lecturer enrols the student", async () => {
    await asLecturer.getByText(courseTitle).click();
    const search = asLecturer.getByLabel(w("courses:roster.search"));
    await search.fill(student.name);
    await asLecturer.getByRole("option", { name: student.name }).click();
    await asLecturer.getByRole("button", { name: w("courses:roster.add"), exact: true }).click();
    await expect(asLecturer.getByText(w("courses:students", { count: 1 }), { exact: true })).toBeVisible();
  });

  await test.step("the lecturer uploads a lesson into the course and publishes it", async () => {
    await asLecturer.goto("/archive");
    await asLecturer.getByRole("button", { name: w("archive:upload") }).click();
    const dialog = asLecturer.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({ name: "e2e.wav", mimeType: "audio/wav", buffer: wav() });
    await dialog.getByLabel(w("upload:fields.title")).fill(lessonTitle);
    await dialog.getByLabel(w("upload:fields.course")).click();
    await asLecturer.getByRole("option", { name: courseTitle }).click();
    await dialog.getByRole("button", { name: w("upload:upload"), exact: true }).click();
    // Untagged, so the app offers tags; this journey is not about tags.
    await asLecturer.getByRole("button", { name: w("tags:suggest.skip") }).click();

    // Publishing is in the tile's ⋯ menu (Redesign v4, component 5), named for
    // the lesson it acts on.
    await asLecturer.getByRole("button", { name: w("media:card.actionsFor", { title: lessonTitle }) }).click();
    await asLecturer.getByRole("menuitem", { name: w("media:card.publish") }).click();
    await expect(asLecturer.getByText(w("archive:notices.published"))).toBeVisible();
  });

  await test.step("the student finds the lesson in their course and opens it", async () => {
    await asStudent.goto("/my-courses");
    await asStudent.getByText(courseTitle).click();
    await expect(asStudent).toHaveURL(/\/my-courses\/\d+/);
    await expect(asStudent.getByText(w("format:track.progress", { completed: 0, total: 1 }))).toBeVisible();
    await asStudent.getByRole("button", { name: lessonTitle, exact: true }).click();
    await expect(asStudent).toHaveURL(/\/media\/\d+/);
    await expect(asStudent.getByRole("heading", { name: lessonTitle })).toBeVisible();
  });

  // PRD COM-3b, COM-4: the lecturer opens the lesson to anyone with the link,
  // and somebody with no account at all follows it.
  await test.step("the lecturer makes the lesson public, and a guest opens the shared link", async () => {
    const lessonId = asStudent.url().match(/\/media\/(\d+)/)[1];
    await asLecturer.goto(`/media/${lessonId}`);
    await asLecturer.getByRole("button", { name: w("lesson:actions.share"), exact: true }).click();
    await asLecturer.getByRole("checkbox", { name: new RegExp(literally(w("lesson:share.publicLink").split(":")[0])) }).click();
    await expect(asLecturer.getByText(w("lesson:share.nowPublic"))).toBeVisible();

    const guestContext = await contextIn(browser, lng);
    const shareUrl = `http://localhost:5173/api/public/share/${lessonId}`;
    // What WhatsApp reads: tags in the HTML, no JavaScript.
    const preview = await (await guestContext.request.get(shareUrl)).text();
    expect(preview).toContain(`<meta property="og:title" content="${lessonTitle}`);

    const guest = await guestContext.newPage();
    await guest.goto(shareUrl);
    await expect(guest).toHaveURL(new RegExp(`/l/${lessonId}$`));
    await expect(guest.getByRole("heading", { name: lessonTitle })).toBeVisible();
    await expect(guest.getByRole("link", { name: w("guest:join") })).toBeVisible();
    // The recording itself plays for a guest: the browser reads its length.
    await expect
      .poll(() => guest.locator("audio").evaluate((a) => a.duration), { timeout: 15_000 })
      .toBeGreaterThan(1);
  });
});
}
