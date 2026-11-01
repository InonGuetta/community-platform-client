import { describe, it, expect } from "vitest";
import { lecturerIdFor, fieldsFromItem, editChanges } from "./lessonFields";

const ADMIN = { id: 1, role: "admin" };
const LECTURER = { id: 2, role: "lecturer" };

const COURSES = [
  { id: 10, title: "גמרא", lecturer_id: 2 },
  { id: 11, title: "הלכה", lecturer_id: 5 },
  { id: 12, title: "ללא מרצה", lecturer_id: null },
];

const ITEM = {
  id: 7,
  title: "שיעור א",
  description: "תיאור",
  media_type: "audio",
  course_id: 10,
  creator_name: "הרב כהן",
};

describe("lecturerIdFor", () => {
  it("credits the course's lecturer when the course has one", () => {
    expect(lecturerIdFor(ADMIN, COURSES[1])).toBe(5);
    expect(lecturerIdFor(LECTURER, COURSES[0])).toBe(2);
  });

  it("credits the uploading lecturer when there is no course", () => {
    expect(lecturerIdFor(LECTURER, undefined)).toBe(2);
  });

  it("credits the uploading lecturer when the course has no lecturer", () => {
    expect(lecturerIdFor(LECTURER, COURSES[2])).toBe(2);
  });

  // undefined, not null: null in the body would mean "clear it".
  it("leaves the field out for an admin with no lecturer to name", () => {
    expect(lecturerIdFor(ADMIN, undefined)).toBeUndefined();
    expect(lecturerIdFor(ADMIN, COURSES[2])).toBeUndefined();
  });
});

describe("fieldsFromItem", () => {
  it("shows the default creator as an empty field", () => {
    expect(fieldsFromItem({ ...ITEM, creator_name: "כללי" }).creatorName).toBe("");
  });

  it("turns a missing course and description into empty fields", () => {
    const fields = fieldsFromItem({ ...ITEM, course_id: null, description: null });
    expect(fields.courseId).toBe("");
    expect(fields.description).toBe("");
  });
});

describe("editChanges", () => {
  const unchanged = () => fieldsFromItem(ITEM);

  it("sends nothing when nothing changed", () => {
    expect(editChanges(ITEM, unchanged(), LECTURER, COURSES)).toEqual({});
  });

  // The reason this function exists: a course the editor cannot manage, sent
  // back unchanged, makes the server refuse the whole edit.
  it("does not re-send an unchanged course alongside a title fix", () => {
    const changes = editChanges(ITEM, { ...unchanged(), title: "שיעור ב" }, ADMIN, COURSES);
    expect(changes).toEqual({ title: "שיעור ב" });
  });

  it("trims the title before comparing", () => {
    expect(editChanges(ITEM, { ...unchanged(), title: "  שיעור א  " }, LECTURER, COURSES)).toEqual({});
  });

  it("treats blank and the default creator as the same value", () => {
    const item = { ...ITEM, creator_name: "כללי" };
    expect(editChanges(item, fieldsFromItem(item), LECTURER, COURSES)).toEqual({});
  });

  it("sends a cleared creator name as empty, for the server to default", () => {
    expect(editChanges(ITEM, { ...unchanged(), creatorName: "  " }, LECTURER, COURSES)).toEqual({ creatorName: "" });
  });

  it("detaches from the course with null", () => {
    const changes = editChanges(ITEM, { ...unchanged(), courseId: "" }, ADMIN, COURSES);
    expect(changes).toEqual({ courseId: null });
  });

  it("moves the credited lecturer with the course", () => {
    const changes = editChanges(ITEM, { ...unchanged(), courseId: 11 }, ADMIN, COURSES);
    expect(changes).toEqual({ courseId: 11, lecturerId: 5 });
  });

  it("compares a course id across string and number", () => {
    expect(editChanges(ITEM, { ...unchanged(), courseId: "10" }, LECTURER, COURSES)).toEqual({});
  });

  it("can clear a description", () => {
    expect(editChanges(ITEM, { ...unchanged(), description: "" }, LECTURER, COURSES)).toEqual({ description: "" });
  });
});
