import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { safeReturnPath, rememberReturnTo, takeReturnTo } from "./returnTo";
import { fakeStorage } from "./offlineStore.fakes";

// Back to where a signed-out reader was going, once signed in — so a shared
// lesson or a course's join link (PRD ROST-9) survives the sign-in.

describe("returning after sign-in", () => {
  beforeEach(() => vi.stubGlobal("sessionStorage", fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("goes back to the page, once", () => {
    rememberReturnTo("/my-courses?join=ABC234");
    expect(takeReturnTo()).toBe("/my-courses?join=ABC234");
    expect(takeReturnTo()).toBe("/archive");
  });

  it("lands on the archive when nothing was remembered", () => {
    expect(takeReturnTo()).toBe("/archive");
  });

  // An address from storage is not trusted to be anything in particular.
  it("never leaves the app", () => {
    for (const value of ["//evil.example/x", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "", null]) {
      expect(safeReturnPath(value)).toBeNull();
    }
    rememberReturnTo("//evil.example");
    expect(takeReturnTo()).toBe("/archive");
    sessionStorage.setItem("returnTo", "https://evil.example");
    expect(takeReturnTo()).toBe("/archive");
  });
});
