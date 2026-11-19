// After `vite build`: is each interface language in chunks of its own?
//
// Hebrew is bundled (the default and every key's fallback); the other four are
// fetched the first time someone picks one (src/i18n/i18n.js). If a change made
// those imports eager, every visitor would download all five languages and
// nothing would fail — the app just gets heavier. So, reading dist/:
//   • the entry chunk holds Hebrew and none of the others;
//   • each other language is in some chunk, and no chunk holds two of them.
// Each language is recognised by its own name for the app (common:appName).

import { readdirSync, readFileSync } from "node:fs";

const DIST = new URL("../dist/", import.meta.url);
const LOCALES = new URL("../src/locales/", import.meta.url);

const appName = (lng) => JSON.parse(readFileSync(new URL(`${lng}/common.json`, LOCALES), "utf8")).appName;
// Vite writes non-ASCII as-is inside JSON chunks, but a minifier may escape it.
const escaped = (text) => [...text].map((c) => (c.charCodeAt(0) > 127 ? `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}` : c)).join("");
const holds = (source, text) => source.includes(text) || source.toLowerCase().includes(escaped(text).toLowerCase());

const assets = readdirSync(new URL("assets/", DIST)).filter((f) => f.endsWith(".js"));
const read = (file) => readFileSync(new URL(`assets/${file}`, DIST), "utf8");
const html = readFileSync(new URL("index.html", DIST), "utf8");
const entry = assets.find((f) => html.includes(`/assets/${f}`));

const problems = [];
if (!entry) problems.push("could not find the entry chunk named in dist/index.html");

const OTHERS = ["yi", "en", "fr", "es"];
const names = Object.fromEntries(["he", ...OTHERS].map((lng) => [lng, appName(lng)]));

if (entry) {
  const main = read(entry);
  if (!holds(main, names.he)) problems.push(`the entry chunk (${entry}) does not hold Hebrew`);
  for (const lng of OTHERS) if (holds(main, names[lng])) problems.push(`the entry chunk (${entry}) holds ${lng}`);
}

for (const lng of OTHERS) {
  const files = assets.filter((f) => holds(read(f), names[lng]));
  if (files.length === 0) problems.push(`no chunk holds ${lng}`);
  for (const file of files) {
    const others = OTHERS.filter((o) => o !== lng && holds(read(file), names[o]));
    if (others.length) problems.push(`${file} holds ${lng} together with ${others.join(", ")}`);
  }
}

if (problems.length) {
  console.error(`Locale chunks:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Locale chunks ok: Hebrew in ${entry}; ${OTHERS.join(", ")} each in their own chunks.`);
