import fs from "node:fs";
import path from "node:path";

// The interface's words, for the end-to-end tests, read from the same files
// the app reads (src/locales/<lng>/<namespace>.json) — so a journey can run in
// any language and find "Sign up" or "הרשמה" by its key, and a translation
// that changes a label never breaks the test.
//
// `w("courses:students", { count: 1 })` follows the app's rules closely
// enough for a test: {{name}} filled in, a plural picked with Intl.PluralRules,
// and Hebrew as the fallback for a key the language lacks.

const LOCALES = path.resolve(__dirname, "../src/locales");
const cache = new Map();
const namespace = (lng, ns) => {
  const key = `${lng}/${ns}`;
  if (!cache.has(key)) cache.set(key, JSON.parse(fs.readFileSync(path.join(LOCALES, lng, `${ns}.json`), "utf8")));
  return cache.get(key);
};

const lookup = (tree, dotted) => dotted.split(".").reduce((node, part) => (node == null ? undefined : node[part]), tree);

export const words = (lng) => {
  const plurals = new Intl.PluralRules(lng === "yi" ? "yi" : lng);
  const find = (language, ns, key, count) => {
    const tree = namespace(language, ns);
    if (count !== undefined) {
      const forms = count === 0 ? ["zero", plurals.select(count), "other"] : [plurals.select(count), "other"];
      for (const form of forms) {
        const value = lookup(tree, `${key}_${form}`);
        if (typeof value === "string") return value;
      }
    }
    return lookup(tree, key);
  };
  return (id, params = {}) => {
    const [ns, key] = id.split(":");
    const value = find(lng, ns, key, params.count) ?? find("he", ns, key, params.count);
    if (typeof value !== "string") throw new Error(`no words for ${id} in ${lng}`);
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name) => (name in params ? String(params[name]) : all));
  };
};

// Escapes text for a RegExp, for labels matched by their start (a field whose
// accessible name also carries a helper text).
export const literally = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
