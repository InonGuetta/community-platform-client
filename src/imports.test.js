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

test("axiosInstance stays a leaf of the import graph", () => {
  const graph = buildGraph();
  const deps = graph.get(path.join(SRC, "utilities/axiosInstance.js")) ?? [];
  // It must not reach back into the store; the store hands it a callback.
  expect(deps.map(rel)).toEqual([]);
});

test("the store is the side that wires the two together", () => {
  const deps = (buildGraph().get(path.join(SRC, "store/store.js")) ?? []).map(rel);
  expect(deps).toContain("utilities/axiosInstance.js");
  expect(deps.some((d) => d.endsWith("authSlice.js"))).toBe(true);
});
