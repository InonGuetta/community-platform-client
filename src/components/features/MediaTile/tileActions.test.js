import { test, expect, vi } from "vitest";
import { tileActions, showsStatusBadge } from "./tileActions";

const item = { id: 1, uploader_id: 7 };
const admin = { id: 1, role: "admin" };
const owner = { id: 7, role: "lecturer" };
const otherLecturer = { id: 8, role: "lecturer" };
const student = { id: 9, role: "student" };
const handlers = { onEditDetails: vi.fn(), onEditTags: vi.fn(), onTogglePublish: vi.fn(), onDelete: vi.fn() };
const none = { download: true, edit: false, tags: false, publish: false, delete: false };
const all = { download: true, edit: true, tags: true, publish: true, delete: true };

test("everybody may download, and a student may do nothing else", () => {
  expect(tileActions({ user: student, item, showAdmin: true, ...handlers })).toEqual(none);
});

test("an admin, and the lecturer who uploaded it, get every action the page handles", () => {
  expect(tileActions({ user: admin, item, showAdmin: true, ...handlers })).toEqual(all);
  expect(tileActions({ user: owner, item, showAdmin: true, ...handlers })).toEqual(all);
});

test("another lecturer's lesson is not theirs to manage", () => {
  expect(tileActions({ user: otherLecturer, item, showAdmin: true, ...handlers })).toEqual(none);
});

test("with תצוגת מנהל off, management actions hide — it is a view, not a permission", () => {
  expect(tileActions({ user: admin, item, showAdmin: false, ...handlers })).toEqual(none);
  expect(showsStatusBadge({ user: admin, item, showAdmin: false })).toBe(false);
  expect(showsStatusBadge({ user: admin, item, showAdmin: true })).toBe(true);
  expect(showsStatusBadge({ user: student, item, showAdmin: true })).toBe(false);
});

// D-14: the personal shelves pass no handlers, and used to show buttons that
// threw when pressed.
test("an action with no handler is not offered, even to an admin", () => {
  expect(tileActions({ user: admin, item, showAdmin: true })).toEqual(none);
  expect(tileActions({ user: admin, item, showAdmin: true, onDelete: vi.fn() })).toEqual({ ...none, delete: true });
});
