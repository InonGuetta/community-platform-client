// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditMediaDialog from "./EditMediaDialog";

// Editing a lesson's details. What is SENT is decided by editChanges, which has
// its own tests (features/UploadMedia/lessonFields.test.js); what is pinned here
// is that the form opens on the lesson as it is and hands back what was typed.

const ITEM = {
  id: 7,
  title: "שיעור בבא מציעא",
  description: "פרק ראשון",
  media_type: "audio",
  course_id: 40,
  course_title: "קורס של מרצה אחר",
  creator_name: "הרב כהן",
};

const renderDialog = (props = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <EditMediaDialog item={ITEM} courses={[{ id: 10, title: "גמרא" }]} onClose={() => {}} onSave={onSave} {...props} />
  );
  return { onSave };
};

it("opens on the lesson's current details", () => {
  renderDialog();
  expect(screen.getByLabelText(/כותרת/)).toHaveProperty("value", ITEM.title);
  expect(screen.getByLabelText(/תיאור/)).toHaveProperty("value", ITEM.description);
  expect(screen.getByLabelText(/שם המרצה/)).toHaveProperty("value", ITEM.creator_name);
});

// A course the editor may not file into is still the one the lesson is in. Left
// out, the select would read as "no course".
it("shows the current course even when it is not one the editor may choose", () => {
  renderDialog();
  expect(screen.getByText(ITEM.course_title)).toBeTruthy();
});

// Decided by the stored file, and tags have their own dialog.
it("offers neither the media type nor the tags", () => {
  renderDialog();
  expect(screen.queryByLabelText(/סוג מדיה/)).toBeNull();
  expect(screen.queryByText(/עד \d+ תגיות/)).toBeNull();
});

it("hands back the edited fields with the item", async () => {
  const user = userEvent.setup();
  const { onSave } = renderDialog();
  const title = screen.getByLabelText(/כותרת/);
  await user.clear(title);
  await user.type(title, "כותרת מתוקנת");
  await user.click(screen.getByRole("button", { name: "שמירה" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  const [item, fields] = onSave.mock.calls[0];
  expect(item).toBe(ITEM);
  expect(fields.title).toBe("כותרת מתוקנת");
  expect(fields.creatorName).toBe(ITEM.creator_name);
});

it("will not save an empty title", async () => {
  const user = userEvent.setup();
  renderDialog();
  await user.clear(screen.getByLabelText(/כותרת/));
  expect(screen.getByRole("button", { name: "שמירה" })).toHaveProperty("disabled", true);
});
