import { describe, it, expect } from "vitest";
import { isAiActionBusy, aiActionOutcome } from "./aiActionState";

describe("an AI action's status", () => {
  it("is busy while queued or running, and not otherwise", () => {
    expect(isAiActionBusy("queued")).toBe(true);
    expect(isAiActionBusy("running")).toBe(true);
    for (const status of ["done", "error", null, undefined]) expect(isAiActionBusy(status)).toBe(false);
  });

  it("announces finishing and failing — from a busy state only", () => {
    expect(aiActionOutcome("running", "done")).toBe("done");
    expect(aiActionOutcome("queued", "done")).toBe("done");
    expect(aiActionOutcome("running", "error")).toBe("error");
  });

  // A row first seen already finished — the page reloaded after the run — is
  // not news, and must not toast "done" on every visit.
  it("says nothing about a status that was already settled", () => {
    expect(aiActionOutcome(undefined, "done")).toBeNull();
    expect(aiActionOutcome("done", "done")).toBeNull();
    expect(aiActionOutcome("error", "done")).toBeNull();
    expect(aiActionOutcome("queued", "running")).toBeNull();
  });
});
