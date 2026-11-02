// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import transcriptReducer from "../../../store/slicesAndThunks/transcriptSlice/transcriptSlice";
import TranscriptEditor from "./TranscriptEditor";

// "תיקון עברית" runs on the server's queue (PRD PIPE-5) and reports back through
// the transcript row. While it runs the editor is read-only; when it finishes
// the corrected text replaces what is in the box.

vi.mock("../../../api/transcriptsApi", () => ({ transcriptsApi: {} }));

const store = configureStore({ reducer: { transcript: transcriptReducer } });

const BASE = { media_id: 9, status: "done", chunks: [{ content: "תוירו" }], edited_text: "תוירו" };

const renderWith = (transcript) => (
  <Provider store={store}>
    <TranscriptEditor transcript={transcript} mediaId={9} canEdit />
  </Provider>
);

it("is read-only, and says why, while the correction runs", () => {
  render(renderWith({ ...BASE, hebrew_fix_status: "running" }));
  expect(screen.getByRole("textbox").readOnly).toBe(true);
  expect(screen.getByText(/העברית מתוקנת ברקע/)).toBeTruthy();
  expect(screen.getByRole("button", { name: /מתקן/ }).disabled).toBe(true);
});

it("takes the corrected text when the correction finishes", () => {
  const { rerender } = render(renderWith({ ...BASE, hebrew_fix_status: "running" }));
  rerender(renderWith({ ...BASE, hebrew_fix_status: "done", edited_text: "תורה" }));
  expect(screen.getByRole("textbox").value).toBe("תורה");
  expect(screen.getByRole("textbox").readOnly).toBe(false);
});

// A visit long after a correction is not a correction finishing: whatever the
// user has in the box must be left alone.
it("does not replace the text for a correction that was already finished", () => {
  const { rerender } = render(renderWith({ ...BASE, hebrew_fix_status: "done", edited_text: "א" }));
  rerender(renderWith({ ...BASE, hebrew_fix_status: "done", edited_text: "ב" }));
  expect(screen.getByRole("textbox").value).toBe("א");
});
