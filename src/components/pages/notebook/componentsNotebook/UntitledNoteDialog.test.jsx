// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UntitledNoteDialog from "./UntitledNoteDialog";

// One button whose words say what pressing it will do: save untitled while the
// field is empty, save under the typed name once there is one.

const setup = () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<UntitledNoteDialog open onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel, field: screen.getByLabelText("שם הכרטיסייה") };
};

test("says the card has no name, and offers to save it anyway", () => {
  const { onSave } = setup();
  expect(screen.getByText("לא צוין שם לכרטיסייה")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "שמור בכל זאת" }));
  expect(onSave).toHaveBeenCalledWith("");
});

test("the button becomes 'שמור' as soon as a name is typed, and saves under it", () => {
  const { onSave, field } = setup();
  fireEvent.change(field, { target: { value: "  מצוות ציצית " } });
  expect(screen.queryByRole("button", { name: "שמור בכל זאת" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "שמור" }));
  expect(onSave).toHaveBeenCalledWith("מצוות ציצית");
});

test("spaces alone are not a name", () => {
  const { field } = setup();
  fireEvent.change(field, { target: { value: "   " } });
  expect(screen.getByRole("button", { name: "שמור בכל זאת" })).toBeInTheDocument();
});

test("Enter saves, and cancelling saves nothing", () => {
  const { onSave, onCancel, field } = setup();
  fireEvent.change(field, { target: { value: "שם" } });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(onSave).toHaveBeenCalledWith("שם");
  fireEvent.click(screen.getByRole("button", { name: "ביטול" }));
  expect(onCancel).toHaveBeenCalled();
});
