/* global document -- used inside page.evaluate, which runs in the browser */
import { test } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { RUN_FILE } from "../fixtures.js";
import { words, literally } from "../words.js";

// Screenshots of every screen of the redesign (Redesign v4, stage 8a): the
// 31 screens of design/REDESIGN_V4.md part D, in the matrix at the bottom, to
// design/qa-shots/<lang>-<mode>-<width>/NN-name.png and an INDEX.md.
//
// The data is this run's own: an admin (from global-setup), a course, an audio
// lesson (published), a video (left a draft), a book, a like, a save, a saved
// list, a note and a resume position. Nothing is transcribed or summarised, so
// the lesson tabs show their "not processed yet" state — INDEX.md says so.

const run = JSON.parse(fs.readFileSync(RUN_FILE, "utf8"));
const OUT = path.resolve(__dirname, "../../design/qa-shots");
const API = "http://localhost:5173/api";
const CREATOR = `מרצה לדוגמה ${run.runId}`;

const wav = (seconds = 20) => {
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

// A one-page PDF, written by hand.
const pdf = () => {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    "<< /Length 62 >>\nstream\nBT /F1 28 Tf 72 700 Td (Sample book page) Tj ET\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, "0")} 00000 n \n`; });
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
};

const video = () => {
  const file = path.join(os.tmpdir(), `screens-${run.runId}.mp4`);
  try {
    execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=15:duration=6", "-pix_fmt", "yuv420p", file], { stdio: "ignore" });
    return fs.readFileSync(file);
  } catch {
    return null;
  } finally {
    fs.rmSync(file, { force: true });
  }
};

const results = [];
const note = (dir, name, route, status, why = "") => results.push({ dir, name, route, status, why });

test("screenshots of every screen", async ({ browser }) => {
  const admin = run.admin;
  const he = words("he");

  // ---- data, through the API as the admin --------------------------------
  const setup = await browser.newContext();
  const sp = await setup.newPage();
  await sp.goto("/sign-in");
  await sp.getByLabel(he("auth:fields.email")).fill(admin.email);
  await sp.getByLabel(new RegExp(`^${literally(he("auth:fields.password"))}`)).fill(admin.password);
  await sp.getByRole("button", { name: he("auth:signIn.submit"), exact: true }).click();
  await sp.waitForURL(/\/archive/);
  const state = await setup.storageState();
  const api = setup.request;
  const me = await (await api.get(`${API}/auth/me`)).json();
  const adminId = me.id ?? me.user?.id;

  const course = await (await api.post(`${API}/courses`, { data: { title: `קורס לדוגמה ${run.runId}`, description: "קורס לצילומי מסך", lecturerId: adminId } })).json();
  const upload = async (multipart, publish) => {
    const res = await api.post(`${API}/media/upload`, { multipart });
    if (!res.ok()) return null;
    const item = await res.json();
    const id = item.id ?? item.media?.id ?? item.item?.id;
    if (id && publish) await api.put(`${API}/media/update/${id}`, { data: { isPublished: true } });
    return id;
  };
  const common = (title, mediaType) => ({ title, description: "תיאור לדוגמה לצילום מסך", mediaType, courseId: String(course.id), creatorName: CREATOR });
  const audioId = await upload({ ...common(`שיעור שמע לדוגמה ${run.runId}`, "audio"), file: { name: "sample.wav", mimeType: "audio/wav", buffer: wav() } }, true);
  const mp4 = video();
  const videoId = mp4 ? await upload({ ...common(`שיעור וידאו לדוגמה ${run.runId}`, "video"), file: { name: "sample.mp4", mimeType: "video/mp4", buffer: mp4 } }, false) : null;
  const bookId = await upload({ ...common(`ספר לדוגמה ${run.runId}`, "text"), file: { name: "sample.pdf", mimeType: "application/pdf", buffer: pdf() } }, true);
  if (audioId) {
    await api.post(`${API}/likes`, { data: { mediaId: audioId } });
    await api.post(`${API}/saves`, { data: { mediaId: audioId } });
    await api.post(`${API}/media/${audioId}/progress`, { data: { positionSeconds: 7 } });
    await api.post(`${API}/notes`, { data: { title: "הערה לדוגמה", body: "<p>גוף ההערה לצילום מסך</p>", mediaId: audioId, timestampSeconds: 5 } });
    await api.post(`${API}/saves/playlists`, { data: { title: `רשימה לדוגמה ${run.runId}`, mediaId: audioId } });
  }
  await setup.close();

  // ---- the screens ---------------------------------------------------------
  // Each: [number, name, route, who, steps(page, w), extra]
  const tab = (i) => async (page) => { await page.getByRole("tab").nth(i).click(); };
  const needs = (id, what) => (id ? null : `no ${what} could be uploaded`);
  const screens = [
    ["01", "sign-in", "/sign-in", "anon"],
    ["30", "sign-up", "/sign-up", "anon"],
    ["31", "forgot-password", "/forgot-password", "anon"],
    ["02", "archive", "/archive", "admin"],
    ["03", "smart-search", "/archive", "admin", async (page) => { await tab(1)(page); }],
    ["29", "archive-filter", "/archive", "admin", async (page, w) => { await page.getByText(w("archive:filter.toggle"), { exact: true }).first().click(); }],
    ["04", "continue", "/continue", "admin"],
    ["06", "likes", "/likes", "admin"],
    ["07", "saved", "/saved", "admin"],
    ["28", "saved-list-open", "/saved", "admin", async (page) => { await page.getByText(`רשימה לדוגמה ${run.runId}`).or(page.getByText(`רשימה לדוגמה ${run.runId}`)).first().click(); }],
    ["25", "creator", `/creators/${encodeURIComponent(CREATOR)}`, "admin"],
    ["05", "notebook", "/notebook", "admin"],
    ["08", "downloads", "/downloads", "admin"],
    ["09", "ask-archive", "/ask", "admin"],
    ["10", "my-courses", "/my-courses", "admin"],
    ["11", "sessions", "/sessions", "admin"],
    ["12", "donate", "/donate", "admin"],
    ["13", "courses", "/courses", "admin"],
    ["14", "courses-expanded", "/courses", "admin", async (page) => { await page.getByText(`קורס לדוגמה ${run.runId}`).first().click(); }],
    ["15", "course-page", `/my-courses/${course.id}`, "admin"],
    ["16", "users", "/users", "admin"],
    ["17", "dashboard", "/admin", "admin"],
    ["18", "profile", "/profile", "admin"],
    ["19", "drawer", "/archive", "admin", async (page, w) => { await page.getByRole("button", { name: w("nav:drawer.open") }).click(); }, { onlyWidth: 390 }],
    ["20", "audio-summary", `/media/${audioId}`, "admin", null, { needs: needs(audioId, "audio lesson") }],
    ["21", "audio-chapters", `/media/${audioId}`, "admin", tab(1), { needs: needs(audioId, "audio lesson") }],
    ["22", "audio-transcript", `/media/${audioId}`, "admin", tab(2), { needs: needs(audioId, "audio lesson") }],
    ["23", "audio-notes", `/media/${audioId}`, "admin", tab(3), { needs: needs(audioId, "audio lesson") }],
    ["24", "audio-discussion", `/media/${audioId}`, "admin", tab(4), { needs: needs(audioId, "audio lesson") }],
    ["26", "video", `/media/${videoId}`, "admin", null, { needs: needs(videoId, "video (ffmpeg missing?)") }],
    ["27", "book", `/media/${bookId}`, "admin", null, { needs: needs(bookId, "book") }],
  ];
  const ALL = screens.map((s) => s[0]);
  const matrix = [
    { lang: "he", mode: "light", width: 1440, only: ALL },
    { lang: "he", mode: "light", width: 390, only: ALL },
    // Just above and below the spec's 768 breakpoint (D-135).
    { lang: "he", mode: "light", width: 800, only: ["02", "05", "13", "17", "20", "27"] },
    { lang: "he", mode: "light", width: 760, only: ["02", "20"] },
    { lang: "en", mode: "light", width: 1440, only: ["01", "02", "05", "09", "16", "18", "20"] },
    { lang: "en", mode: "light", width: 390, only: ["19"] },
    { lang: "he", mode: "dark", width: 1440, only: ["02", "05", "12", "16", "17", "18", "20", "27"] },
  ];

  let taken = 0;
  for (const { lang, mode, width, only } of matrix) {
    const dir = `${lang}-${mode}-${width}`;
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
    const w = words(lang);
    for (const kind of ["anon", "admin"]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        locale: lang === "he" ? "he-IL" : "en-US",
        ...(kind === "admin" ? { storageState: state } : {}),
      });
      await context.addInitScript(([code, colorMode]) => {
        try {
          localStorage.setItem("language", code);
          localStorage.setItem("colorMode", colorMode);
          sessionStorage.setItem("languageChosenSignedOut", code);
        } catch { /* a page with no storage starts in the defaults */ }
      }, [lang, mode]);
      const page = await context.newPage();
      for (const [num, name, route, who, steps, extra = {}] of screens) {
        if (who !== kind || !only.includes(num)) continue;
        if (extra.onlyWidth && extra.onlyWidth !== width) continue;
        const file = `${num}-${name}.png`;
        if (extra.needs) { note(dir, file, route, "missing", extra.needs); continue; }
        try {
          await page.goto(route);
          await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
          await page.waitForTimeout(800);
          if (steps) { await steps(page, w); await page.waitForTimeout(700); }
          const overflow = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            const wide = document.documentElement.scrollWidth > vw + 1;
            if (!wide) return "";
            const bad = [...document.body.querySelectorAll("*")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1); });
            return `horizontal scroll: ${bad.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").pop()}`).join(", ")}`;
          });
          await page.screenshot({ path: path.join(OUT, dir, file), fullPage: true });
          taken += 1;
          note(dir, file, route, "ok", overflow);
        } catch (err) {
          note(dir, file, route, "failed", String(err.message).split("\n")[0]);
        }
      }
      await context.close();
    }
  }

  // ---- the index -----------------------------------------------------------
  const count = (s) => results.filter((r) => r.status === s).length;
  const lines = [
    "# QA screenshots - Redesign v4 stage 8a",
    "",
    `Taken ${taken} shots on ${new Date().toISOString().slice(0, 10)}. Missing: ${count("missing")}. Failed: ${count("failed")}.`,
    "Data: a throwaway admin, one course, a published audio lesson, a draft video, a published PDF book, a like, a save, a saved list and a note. Nothing is transcribed or summarised, so the lesson tabs show the not-processed state, not a transcript.",
    "The drawer (19) exists at 390 only; it is not taken at 1440.",
    "",
    "| Folder | File | Route | Result |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.dir} | ${r.name} | \`${r.route}\` | ${r.status}${r.why ? ` - ${r.why}` : ""} |`),
    "",
  ];
  fs.writeFileSync(path.join(OUT, "INDEX.md"), lines.join("\n"));
});
