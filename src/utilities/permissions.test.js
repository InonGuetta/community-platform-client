import { describe, it, expect } from "vitest";
import { isPrivileged, canManageMedia, canManageCourse } from "./permissions";

// These cases are deliberately the same ones the server asserts in
// test/permissions.test.js. The two files are the contract between what the UI
// offers and what the API allows; if one changes without the other, a user gets
// a control that fails on press.

const ADMIN = { id: 1, role: "admin" };
const OWNER = { id: 2, role: "lecturer" };
const OTHER = { id: 3, role: "lecturer" };
const STUDENT = { id: 4, role: "student" };

const ITEM = { id: 7, uploader_id: 2 };

describe("isPrivileged", () => {
  it("covers lecturers and admins", () => {
    expect(isPrivileged(OWNER)).toBe(true);
    expect(isPrivileged(ADMIN)).toBe(true);
  });

  it("excludes students and signed-out visitors", () => {
    expect(isPrivileged(STUDENT)).toBe(false);
    expect(isPrivileged(null)).toBe(false);
    expect(isPrivileged(undefined)).toBe(false);
  });
});

describe("canManageMedia", () => {
  it("lets an admin manage any item", () => {
    expect(canManageMedia(ADMIN, ITEM)).toBe(true);
  });

  it("lets a lecturer manage their own item", () => {
    expect(canManageMedia(OWNER, ITEM)).toBe(true);
  });

  it("stops a lecturer managing someone else's item", () => {
    expect(canManageMedia(OTHER, ITEM)).toBe(false);
  });

  it("stops a student managing anything", () => {
    expect(canManageMedia(STUDENT, { uploader_id: 4 })).toBe(false);
  });

  it("matches ids across string/number, as the server does", () => {
    expect(canManageMedia({ id: "2", role: "lecturer" }, ITEM)).toBe(true);
    expect(canManageMedia(OWNER, { uploader_id: "2" })).toBe(true);
  });

  // MediaViewPage calls this before the media item has loaded, so an absent
  // item must read as "not yet", never as "allowed".
  it("is false while the item or the user is still unknown", () => {
    expect(canManageMedia(OWNER, undefined)).toBe(false);
    expect(canManageMedia(OWNER, {})).toBe(false);
    expect(canManageMedia(null, ITEM)).toBe(false);
    expect(canManageMedia({ role: "lecturer" }, ITEM)).toBe(false);
  });
});

// The same cases as the server's canManageCourse in test/permissions.test.js.
describe("canManageCourse", () => {
  const course = { lecturer_id: 7 };
  it("lets an admin manage any course", () => {
    expect(canManageCourse({ id: 1, role: "admin" }, course)).toBe(true);
  });
  it("lets a lecturer manage only the courses they teach", () => {
    expect(canManageCourse({ id: 7, role: "lecturer" }, course)).toBe(true);
    expect(canManageCourse({ id: 8, role: "lecturer" }, course)).toBe(false);
  });
  it("compares ids numerically", () => {
    expect(canManageCourse({ id: "7", role: "lecturer" }, course)).toBe(true);
  });
  it("refuses a course with no lecturer to anyone but an admin", () => {
    expect(canManageCourse({ id: 7, role: "lecturer" }, { lecturer_id: null })).toBe(false);
  });
});
