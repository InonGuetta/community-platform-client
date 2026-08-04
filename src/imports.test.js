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
