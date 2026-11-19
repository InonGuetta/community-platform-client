// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import AppTextField from "./AppTextField";

const renderField = (props) =>
  render(
    <ThemeProvider theme={buildTheme("light")}>
      <AppTextField label="שם תצוגה" {...props} />
    </ThemeProvider>
  );

test("the label names the field, and sits above it rather than inside it (D-28)", () => {
  renderField();
  const input = screen.getByLabelText("שם תצוגה");
  const label = document.querySelector("label");
  // Before the field in the document, so it reads first and lays out above.
  expect(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getComputedStyle(label).position).toBe("relative");
  // Shrunk from the start, so a placeholder is visible before focus.
  expect(label).toHaveAttribute("data-shrink", "true");
});

test("fills the width of its column unless told otherwise", () => {
  const { container, unmount } = renderField();
  expect(container.querySelector(".MuiFormControl-fullWidth")).not.toBeNull();
  unmount();
  const narrow = renderField({ fullWidth: false });
  expect(narrow.container.querySelector(".MuiFormControl-fullWidth")).toBeNull();
});

test("a required field keeps its name starting with the words", () => {
  renderField({ required: true });
  expect(screen.getByLabelText(/^שם תצוגה/)).toBeRequired();
});
