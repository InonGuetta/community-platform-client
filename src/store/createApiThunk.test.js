import { test, expect, describe, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { createApiThunk } from "./createApiThunk";
import { rejectionOf } from "../utilities/apiError";

// The factory every API thunk is built with. What it must be is the hand-written
// form it replaced, to the action: the same types, the same payloads, the same
// rejection a reducer or a screen reads — so the tests run the two side by side.

const serverError = Object.assign(new Error("Request failed"), {
  response: { status: 409, data: { message: "Already liked", code: "CONFLICT" } },
});
const networkError = new Error("Network Error");

const handWritten = (type, fallback, run, options) =>
  createAsyncThunk(type, async (arg, { rejectWithValue, ...api }) => {
    try {
      return await run(arg, { rejectWithValue, ...api });
    } catch (err) {
      return rejectWithValue(rejectionOf(err, fallback));
    }
  }, options);

// What a thunk dispatches, without the random request id.
const dispatchOf = async (thunk, arg, getState = () => ({})) => {
  const actions = [];
  const dispatch = vi.fn((action) => { actions.push(action); return action; });
  const result = await thunk(arg)(dispatch, getState, undefined);
  const strip = ({ meta, ...rest }) => {
    const { requestId, ...kept } = meta ?? {};
    return { ...rest, meta: kept };
  };
  return { actions: actions.map(strip), result: strip(result) };
};

describe("createApiThunk", () => {
  test("is named and typed like createAsyncThunk", () => {
    const thunk = createApiThunk("likes/add", "Failed to like", async () => {});
    expect(thunk.typePrefix).toBe("likes/add");
    expect([thunk.pending.type, thunk.fulfilled.type, thunk.rejected.type])
      .toEqual(["likes/add/pending", "likes/add/fulfilled", "likes/add/rejected"]);
  });

  test("fulfils with what the payload creator returns, given the arg and the thunk API", async () => {
    const run = vi.fn(async (mediaId, { getState }) => ({ mediaId, user: getState().auth.user }));
    const { result } = await dispatchOf(createApiThunk("likes/add", "Failed to like", run), 7, () => ({ auth: { user: 3 } }));
    expect(result.type).toBe("likes/add/fulfilled");
    expect(result.payload).toEqual({ mediaId: 7, user: 3 });
    expect(run.mock.calls[0][0]).toBe(7);
  });

  test("a server error rejects with its message and code", async () => {
    const { result } = await dispatchOf(createApiThunk("likes/add", "Failed to like", async () => { throw serverError; }), 7);
    expect(result.type).toBe("likes/add/rejected");
    expect(result.payload).toEqual({ message: "Already liked", code: "CONFLICT" });
    expect(result.meta.rejectedWithValue).toBe(true);
  });

  test("an error with nothing to say rejects with the fallback", async () => {
    const { result } = await dispatchOf(createApiThunk("likes/add", "Failed to like", async () => { throw networkError; }), 7);
    expect(result.payload).toEqual({ message: "Failed to like", code: undefined });
  });

  test("a payload creator that throws before it awaits is caught the same way", async () => {
    const { result } = await dispatchOf(createApiThunk("likes/add", "Failed to like", () => { throw serverError; }), 7);
    expect(result.payload).toEqual({ message: "Already liked", code: "CONFLICT" });
  });

  test("createAsyncThunk's options reach it", async () => {
    const run = vi.fn();
    const thunk = createApiThunk("media/fetchMore", "Failed", run, { condition: () => false });
    const { actions, result } = await dispatchOf(thunk, undefined);
    expect(run).not.toHaveBeenCalled();
    expect(actions).toEqual([]);
    expect(result.meta.condition).toBe(true);
  });
});

describe("the same, action for action, as the hand-written form", () => {
  const cases = {
    "a value": async (id) => ({ id }),
    "an awaited call": async (id) => ({ ...(await Promise.resolve({ id })), extra: true }),
    "a server error": async () => { throw serverError; },
    "a network error": async () => { throw networkError; },
    "a synchronous throw": () => { throw serverError; },
    "nothing": async () => undefined,
  };
  for (const [name, run] of Object.entries(cases)) {
    test(name, async () => {
      const factory = await dispatchOf(createApiThunk("x/y", "Fallback", run), 5);
      const original = await dispatchOf(handWritten("x/y", "Fallback", run), 5);
      expect(factory).toEqual(original);
    });
  }
});

// ── No new thunk writes the wrapper out again ───────────────────────────────
//
// The five below are hand-written on purpose: something in each must NOT run
// inside the try that turns every throw into a rejection payload. Anything else
// that catches into rejectionOf by hand is a thunk that should have been
// createApiThunk — this fails on it, and on an entry here that is no longer
// true, so the list cannot go stale.
const HAND_WRITTEN = {
  "store/slicesAndThunks/authSlice/authPost.js": "auth/logout — a comment inside its catch says why rejecting is fine",
  "store/slicesAndThunks/mediaSlice/mediaGet.js": "media/fetchMore — reads the slice before the try",
  "store/slicesAndThunks/notesSlice/notesGet.js": "notes/fetchBodies — works out what to ask for before the try",
  "store/slicesAndThunks/notesSlice/notesPut.js": "notes/reorder — its catch also re-reads the list",
  "store/slicesAndThunks/transcriptSlice/transcriptGet.js": "transcript/fetch — normalises its argument before the try",
};
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name) ? [full] : [];
  });

test("only the listed thunks catch into rejectionOf by hand", () => {
  const files = sources(SRC);
  expect(files.length).toBeGreaterThan(100);
  const byHand = files
    .map((file) => path.relative(SRC, file).split(path.sep).join("/"))
    .filter((rel) => rel !== "store/createApiThunk.js")
    .filter((rel) => fs.readFileSync(path.join(SRC, rel), "utf8").includes("rejectWithValue(rejectionOf("));
  expect(byHand.sort()).toEqual(Object.keys(HAND_WRITTEN).sort());
});
