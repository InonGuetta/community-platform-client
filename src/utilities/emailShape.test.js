import { describe, it, expect } from "vitest";
import { emailProblem } from "./emailShape";

// The client's copy of the server's email check.
//
// The two live in separate repositories and share no code, so this file's real
// job is to pin the CLIENT copy against the same cases the server's
// emailShape.test.js pins its own against. If the two ever answer differently,
// the direction matters: a client that is too permissive costs a round trip, one
// that is too strict locks somebody out of signing up. The accept cases below
// are therefore the ones that must never regress.

describe("addresses that must be accepted", () => {
  it("accepts ordinary addresses", () => {
    for (const email of [
      "user@example.com",
      "first.last@example.com",
      "user+tag@example.com",
      "user_name@example.co.il",
      "user-name@sub.domain.example.org",
      "u@a.co",
      "USER@EXAMPLE.COM",
      "  spaced@example.com  ",
    ]) {
      expect(emailProblem(email), email).toBeNull();
    }
  });

  // Refusing this would be exactly the lockout the check is written to avoid.
  it("accepts a Hebrew local part", () => {
    expect(emailProblem("ישראל@example.com")).toBeNull();
  });
});

describe("addresses that must be refused", () => {
  it("refuses a missing @", () => {
    expect(emailProblem("userexample.com")).toBeTruthy();
  });

  // The most common real mistake: the sender simply stopped typing.
  it("refuses a domain with no suffix", () => {
    const problem = emailProblem("user@gmail");
    expect(problem).toBeTruthy();
    expect(problem).toMatch(/סיומת/);
  });

  it("refuses two @", () => {
    expect(emailProblem("user@a@b.com")).toBeTruthy();
  });

  it("refuses whitespace inside", () => {
    expect(emailProblem("user name@example.com")).toBeTruthy();
  });

  it("refuses stray dots", () => {
    for (const email of [".u@x.com", "u.@x.com", "u..s@x.com", "u@x..com", "u@.x.com", "u@x.com."]) {
      expect(emailProblem(email), email).toBeTruthy();
    }
  });

  it("refuses a one-letter or numeric suffix", () => {
    expect(emailProblem("user@example.c")).toBeTruthy();
    expect(emailProblem("user@example.123")).toBeTruthy();
  });

  it("refuses nothing at all", () => {
    for (const value of ["", "   ", null, undefined, 42]) {
      expect(emailProblem(value), JSON.stringify(value)).toBeTruthy();
    }
  });
});

// A generic "כתובת אימייל אינה תקינה" makes somebody retype a correct address
// several times. Each refusal has to say which part is wrong.
describe("the message explains itself", () => {
  it("gives a specific Hebrew reason, never a generic one", () => {
    for (const email of ["userexample.com", "user@gmail", "user name@x.com"]) {
      const problem = emailProblem(email);
      expect(problem, email).toMatch(/[֐-׿]/);
      expect(problem).not.toBe("כתובת אימייל אינה תקינה");
    }
  });
});
