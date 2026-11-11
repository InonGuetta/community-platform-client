// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import transcriptReducer from "../../../store/slicesAndThunks/transcriptSlice/transcriptSlice";

// The archive's smart search: one hybrid search per Enter or button press (each
// costs an embedding and a rerank on the server), never two at once; an empty
// box clears the results; a result opens its lesson at its moment.

const search = vi.hoisted(() => vi.fn());
vi.mock("../../../api/transcriptsApi", () => ({ transcriptsApi: { search: (...a) => search(...a) } }));

import SmartSearch from "./SmartSearch";

const RESULT = { media_id: 7, chunk_index: 0, start_time: 95, media_title: "שיעור בתפילה", content: "כוונה", headline: "<b>כוונה</b>", similarity: 0.8 };

const renderSearch = () => {
  const store = configureStore({ reducer: { transcript: transcriptReducer } });
  const onOpenResult = vi.fn();
  render(<Provider store={store}><SmartSearch onOpenResult={onOpenResult} /></Provider>);
  return { store, onOpenResult };
};
const box = () => screen.getByRole("textbox", { name: "חיפוש עומק חכם" });

beforeEach(() => {
  vi.clearAllMocks();
  search.mockResolvedValue([RESULT]);
});

test("Enter runs one hybrid search for what was typed, and its result opens the lesson at its moment", async () => {
  const { onOpenResult } = renderSearch();
  fireEvent.change(box(), { target: { value: "  כוונה  " } });
  fireEvent.keyDown(box(), { key: "Enter" });
  expect(search).toHaveBeenCalledWith({ q: "כוונה", mode: "hybrid" });
  fireEvent.click(await screen.findByText("שיעור בתפילה"));
  expect(onOpenResult).toHaveBeenCalledWith(7, 95);
});

test("a second press while one search runs starts no other", async () => {
  let finish;
  search.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  renderSearch();
  fireEvent.change(box(), { target: { value: "כוונה" } });
  fireEvent.keyDown(box(), { key: "Enter" });
  fireEvent.keyDown(box(), { key: "Enter" });
  expect(search).toHaveBeenCalledTimes(1);
  finish([]);
  expect(await screen.findByText("לא נמצאו תוצאות תואמות.")).toBeInTheDocument();
});

test("an empty box clears the results without asking the server", async () => {
  const { store } = renderSearch();
  fireEvent.change(box(), { target: { value: "כוונה" } });
  fireEvent.click(screen.getByRole("button", { name: "חיפוש" }));
  await screen.findByText("שיעור בתפילה");
  fireEvent.change(box(), { target: { value: "   " } });
  fireEvent.keyDown(box(), { key: "Enter" });
  expect(search).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(store.getState().transcript.searchResults).toEqual([]));
  expect(screen.queryByText("לא נמצאו תוצאות תואמות.")).not.toBeInTheDocument();
});
