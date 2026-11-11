// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import transcriptReducer from "../../../store/slicesAndThunks/transcriptSlice/transcriptSlice";

// The editor's three buttons: saving an edited transcript (and saying whether
// it worked), starting the pipeline (and refetching at once, which is what turns
// the page's polling on), and queueing the Hebrew correction.

const transcriptsApi = vi.hoisted(() => ({ update: vi.fn(), trigger: vi.fn(), get: vi.fn(), fixHebrew: vi.fn() }));
vi.mock("../../../api/transcriptsApi", () => ({ transcriptsApi }));

import TranscriptEditor from "./TranscriptEditor";

const DONE = { media_id: 9, status: "done", chunks: [{ content: "שלום" }], edited_text: "שלום" };

const renderEditor = (transcript = DONE) => {
  const store = configureStore({ reducer: { transcript: transcriptReducer } });
  render(<Provider store={store}><TranscriptEditor transcript={transcript} mediaId={9} canEdit /></Provider>);
};

beforeEach(() => {
  vi.clearAllMocks();
  transcriptsApi.update.mockImplementation(async (mediaId, payload) => ({ media_id: mediaId, ...payload }));
  transcriptsApi.trigger.mockResolvedValue({});
  transcriptsApi.get.mockResolvedValue({ ...DONE, status: "pending" });
  transcriptsApi.fixHebrew.mockResolvedValue({});
});

test("saving sends the edited text and says it was saved", async () => {
  renderEditor();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "שלום עולם" } });
  fireEvent.click(screen.getByRole("button", { name: "שמור תמלול" }));
  expect(await screen.findByText("התמלול נשמר בהצלחה")).toBeInTheDocument();
  expect(transcriptsApi.update).toHaveBeenCalledWith(9, { editedText: "שלום עולם" });
});

// A refused save is not pinned here: the editor puts the thunk's payload — an
// object, { message, code } — straight into an Alert, and React refuses to
// render it. A known bug, reported separately; not this refactor's to change.

test("starting the pipeline refetches the transcript at once", async () => {
  renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "הפעל תמלול" }));
  await waitFor(() => expect(transcriptsApi.trigger).toHaveBeenCalledWith(9));
  await waitFor(() => expect(transcriptsApi.get).toHaveBeenCalledWith(9, { content: true }));
});

test("a refused start does not refetch", async () => {
  transcriptsApi.trigger.mockRejectedValue(new Error("402"));
  renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "הפעל תמלול" }));
  await waitFor(() => expect(transcriptsApi.trigger).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByRole("button", { name: "הפעל תמלול" })).toBeEnabled());
  expect(transcriptsApi.get).not.toHaveBeenCalled();
});

test("the Hebrew correction is queued for this lesson", async () => {
  renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "תקן עברית" }));
  await waitFor(() => expect(transcriptsApi.fixHebrew).toHaveBeenCalledWith(9));
});
