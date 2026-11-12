import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A structural guard rather than a behavioural one.
//
// Bundlers tolerate import cycles, so one does not fail the build — it fails at
// runtime, as a binding that is undefined while the other module is still
// evaluating. Two changes so far had to be shaped specifically to avoid one:
// axiosInstance receives its 401 handler by injection instead of importing the
// store, and the upload progress action lives in uiSlice because mediaSlice
// already imports the thunk that would have to dispatch it. Neither reason is
// visible from the code alone, so this keeps them from being undone by accident.

const SRC = path.dirname(fileURLToPath(import.meta.url));
const rel = (file) => path.relative(SRC, file).split(path.sep).join("/");

const resolveImport = (fromFile, spec) => {
  if (!spec.startsWith(".")) return null; // a package, not our code
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.js`, `${base}.jsx`, path.join(base, "index.js"), path.join(base, "index.jsx")];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
};

const collectFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return /\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name) ? [full] : [];
  });

const buildGraph = () => {
  const graph = new Map();
  for (const file of collectFiles(SRC)) {
    const source = fs.readFileSync(file, "utf8");
    const specs = [...source.matchAll(/import\s+[\s\S]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
    graph.set(file, specs.map((s) => resolveImport(file, s)).filter(Boolean));
  }
  return graph;
};

const findCycles = (graph) => {
  const cycles = [];
  const state = new Map();
  const stack = [];
  const visit = (node) => {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") {
      cycles.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }
    state.set(node, "open");
    stack.push(node);
    for (const dep of graph.get(node) ?? []) visit(dep);
    stack.pop();
    state.set(node, "done");
  };
  for (const node of graph.keys()) visit(node);
  return cycles;
};

test("no module in src/ imports itself in a cycle", () => {
  const cycles = findCycles(buildGraph());
  expect(cycles.map((c) => c.map(rel).join(" -> "))).toEqual([]);
});

// Everything reachable from a file, not just what it imports directly. A cycle
// back into the store is created just as effectively by a dependency two hops
// away as by a direct import.
const closure = (graph, entry) => {
  const seen = new Set();
  const walk = (node) => {
    for (const dep of graph.get(node) ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      walk(dep);
    }
  };
  walk(entry);
  return [...seen];
};

test("axiosInstance never reaches the store, at any depth", () => {
  const graph = buildGraph();
  const reachable = closure(graph, path.join(SRC, "utilities/axiosInstance.js")).map(rel);

  // The invariant this file exists to protect: the store hands axiosInstance
  // its 401 handler through setUnauthorizedHandler precisely so that the
  // dependency runs one way. Asserting on the whole closure rather than on the
  // direct imports is what makes that hold when axiosInstance picks up a
  // helper — as it has for the logger — and that helper later grows an import
  // of its own.
  expect(reachable.filter((f) => f.startsWith("store/"))).toEqual([]);
});

// The api/ layer is only worth having if it cannot be bypassed. Nothing stops
// someone reaching for axiosInstance directly in a new thunk — it is one import
// away and it works — and the URLs would drift back out of api/ one call at a
// time, which is the state this replaced.
test("only src/api/ talks to axiosInstance", () => {
  const graph = buildGraph();
  const target = path.join(SRC, "utilities/axiosInstance.js");

  const importers = [...graph.entries()]
    .filter(([, deps]) => deps.includes(target))
    .map(([file]) => rel(file));

  // store.js is the documented exception: it injects the 401 handler with
  // setUnauthorizedHandler, which is what keeps axiosInstance from importing the
  // store and closing a cycle (see the two tests above).
  const allowed = (f) => f.startsWith("api/") || f === "store/store.js";
  expect(importers.filter((f) => !allowed(f))).toEqual([]);

  // Guards against the rule passing because the graph came back empty.
  expect(importers.some((f) => f.startsWith("api/"))).toBe(true);
});

test("the logger stays dependency-free, so importing it cannot create a cycle", () => {
  // It is imported from both sides of the app, axiosInstance included. A module
  // that everything depends on must depend on nothing, or it becomes the link
  // that closes a cycle between two parts that are otherwise unrelated.
  const deps = (buildGraph().get(path.join(SRC, "utilities/logger.js")) ?? []).map(rel);
  expect(deps).toEqual([]);
});

test("the store is the side that wires the two together", () => {
  const deps = (buildGraph().get(path.join(SRC, "store/store.js")) ?? []).map(rel);
  expect(deps).toContain("utilities/axiosInstance.js");
  expect(deps.some((d) => d.endsWith("authSlice.js"))).toBe(true);
});

// utilities/ is the floor of the client: everything may import it, and it
// imports nothing above it — no component, no slice or thunk, no api module.
// That is what lets a helper move there from a page and be shared without
// dragging a page's dependencies along. Something that needs the store (a
// shelf's thunk, say) belongs higher up: components/layout/personalShelves.js
// is the example.
test("utilities/ imports nothing from components/, store/ or api/", () => {
  const graph = buildGraph();
  const above = /^(components|store|api)\//;
  const crossings = [...graph.entries()]
    .filter(([file]) => rel(file).startsWith("utilities/"))
    .flatMap(([file, deps]) => deps.map(rel).filter((d) => above.test(d)).map((d) => `${rel(file)} -> ${d}`));
  expect(crossings).toEqual([]);

  // Guards against the rule passing because no utilities file was found.
  expect([...graph.keys()].filter((f) => rel(f).startsWith("utilities/")).length).toBeGreaterThan(20);
});

// ── Page folders ────────────────────────────────────────────────────────────
//
// components/pages/<page>/ holds what that page alone uses. A component two
// screens share is in components/features/ (the note cards, the media grid,
// the chat pane) and the app's shell is in components/layout/ — and neither of
// those may reach back into a page, or changing one page silently changes
// another. Tests are not part of the graph, so a page's test may still render
// a neighbour.
const pageOf = (relPath) => relPath.match(/^components\/pages\/([^/]+)\//)?.[1] ?? null;

test("features/ and layout/ import nothing from pages/", () => {
  const crossings = [...buildGraph().entries()]
    .filter(([file]) => /^components\/(features|layout)\//.test(rel(file)))
    .flatMap(([file, deps]) => deps.map(rel).filter((d) => pageOf(d)).map((d) => `${rel(file)} -> ${d}`));
  expect(crossings).toEqual([]);
});

// The only places one page uses another's files, each on purpose. Adding to
// this list is a decision: the alternative is nearly always to move the file
// to features/ (a component) or utilities/ (a helper).
const ALLOWED_PAGE_CROSSINGS = [
  // A lesson opened in a floating window over the notebook is the lesson
  // page's own player, reader, notes and actions — so it lives with them, and
  // the notebook opens it.
  ["notebook", "components/pages/mediaView/componentsMediaView/SourcePreviewDialog.jsx"],
  // A lecturer's page is the archive with the creator fixed: the same cards,
  // filters and paging (useArchivePageController({ fixedCreator })).
  ["creators", "components/pages/archive/componentsArchive/ArchiveBrowser.jsx"],
  ["creators", "components/pages/archive/useArchivePageController.js"],
];

test("a page imports another page's files only where that is allowed", () => {
  const allowed = new Set(ALLOWED_PAGE_CROSSINGS.map(([page, target]) => `${page} -> ${target}`));
  const graph = buildGraph();
  const crossings = [...graph.entries()].flatMap(([file, deps]) => {
    const from = pageOf(rel(file));
    if (!from) return [];
    return deps.map(rel)
      .filter((d) => pageOf(d) && pageOf(d) !== from)
      .map((d) => `${from} -> ${d}`)
      .filter((edge) => !allowed.has(edge))
      .map((edge) => `${rel(file)}: ${edge}`);
  });
  expect(crossings).toEqual([]);

  // Every allowance is still used — an entry nothing needs any more is a
  // permission waiting to be misused, so it goes.
  const used = new Set([...graph.entries()].flatMap(([file, deps]) => {
    const from = pageOf(rel(file));
    return from ? deps.map((d) => `${from} -> ${rel(d)}`) : [];
  }));
  expect([...allowed].filter((edge) => !used.has(edge))).toEqual([]);
});

// ── Where state lives (CLAUDE.md) ───────────────────────────────────────────
//
// A .jsx renders what its hook hands it. ESLint holds the rule
// (no-restricted-imports on react-redux, eslint.config.js), so a breach shows
// in the editor as it is typed; this runs the real config on a probe file, so
// the rule cannot quietly disappear from it — and every .jsx in src/ is held
// to it, the four by-design exceptions apart.
const JSX_STORE_BY_DESIGN = [
  "main.jsx",
  "App.jsx",
  "components/pages/auth/ProtectedRoute.jsx",
  "components/features/Notification/GlobalSnackbar.jsx",
];

const PROBE = [
  'import { useSelector } from "react-redux";',
  "export const Probe = () => useSelector(() => null);",
  "",
].join("\n");
const storeRuleHits = async (filePath, code = PROBE) => {
  const { ESLint } = await import("eslint");
  const [result] = await new ESLint().lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports");
};

test("ESLint refuses react-redux in a .jsx, and only there", async () => {
  expect(await storeRuleHits("src/components/features/Probe.jsx")).toHaveLength(1);
  expect(await storeRuleHits("src/components/features/useProbe.js")).toHaveLength(0);
  expect(await storeRuleHits("src/components/features/Probe.test.jsx")).toHaveLength(0);
  for (const file of JSX_STORE_BY_DESIGN) expect(await storeRuleHits(`src/${file}`)).toHaveLength(0);
}, 60000);

test("only the by-design shell imports react-redux from a .jsx", () => {
  const usingStore = collectFiles(SRC)
    .filter((file) => file.endsWith(".jsx") && /from\s*["']react-redux["']/.test(fs.readFileSync(file, "utf8")))
    .map(rel);
  expect(usingStore.sort()).toEqual([...JSX_STORE_BY_DESIGN].sort());
});

// Every read of the store is a named selector in store/selectors/ — so the
// question "who reads this field" is one search, and a field renamed in a slice
// is one file to fix rather than a hunt through hooks. An arrow written inside
// useSelector(…) is the thing this refuses; a selector built by a named factory,
// useSelector(selectXFor(id)), is not an arrow and passes.
test("no hook reads the store through an inline arrow", () => {
  const inline = collectFiles(SRC)
    .filter((file) => /useSelector\(\s*(\(\s*\w*\s*\)|\w+)\s*=>/.test(fs.readFileSync(file, "utf8")))
    .map(rel);
  expect(inline).toEqual([]);
});
