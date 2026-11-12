// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "../../../store/slicesAndThunks/notesSlice/notesSlice";
import bookmarksReducer from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";

// The trail of sources a notebook visit opens: every bookmark opened from the
// sidebar joins it once (the same place again is the entry it already has),
// the window walks it with its arrows, the X puts the window away and keeps
// the trail, "close this one" drops the entry on screen and lands on its
// neighbour, and "close everything" ends the run. The window itself is stood in
// for: what it shows is what the page hands it.

vi.mock("../../../api/notesApi", () => ({
  notesApi: { list: vi.fn().mockResolvedValue([]), byIds: vi.fn(), aboutMedia: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), reorder: vi.fn() },
}));
const BOOKMARKS = [
  { id: 1, media_id: 7, media_title: "שיעור בתפילה", media_type: "audio", timestamp_seconds: 30, note: "סימנייה א" },
  { id: 2, media_id: 7, media_title: "שיעור בתפילה", media_type: "audio", timestamp_seconds: 90, note: "סימנייה ב" },
  { id: 3, media_id: 9, media_title: "קונטרס", media_type: "text", timestamp_seconds: null, page_number: 4, note: "סימנייה ג" },
];
vi.mock("../../../api/bookmarksApi", () => ({
  bookmarksApi: { list: vi.fn(async () => BOOKMARKS), create: vi.fn(), remove: vi.fn(), update: vi.fn() },
}));
vi.mock("../mediaView/componentsMediaView/SourcePreviewDialog", () => ({
  default: (props) => (
    <div
      data-testid="window"
      data-media={props.mediaId}
      data-time={props.timestampSeconds ?? ""}
      data-page={props.pageNumber ?? ""}
      data-place={`${props.trailPosition}/${props.trailLength}`}
      data-marks={props.bookmarks.map((b) => b.id).join(",")}
    >
      {props.onPrev && <button onClick={props.onPrev}>prev</button>}
      {props.onNext && <button onClick={props.onNext}>next</button>}
      <button onClick={props.onClose}>x</button>
      <button onClick={props.onCloseCurrent}>close-current</button>
      <button onClick={props.onCloseAll}>close-all</button>
    </div>
  ),
}));

import NotebookPage from "./NotebookPage";

const renderNotebook = async () => {
  const store = configureStore({
    reducer: { notes: notesReducer, bookmarks: bookmarksReducer, notification: notificationReducer },
  });
  render(<Provider store={store}><NotebookPage /></Provider>);
  await screen.findByText("סימנייה א");
};
const open = (note) => fireEvent.click(screen.getByText(note));
const windowShows = () => {
  const w = screen.queryByTestId("window");
  return w && { media: w.dataset.media, time: w.dataset.time, page: w.dataset.page, place: w.dataset.place, marks: w.dataset.marks };
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

test("each bookmark opened joins the trail once, with its lesson's marks in order", async () => {
  await renderNotebook();
  open("סימנייה א");
  expect(windowShows()).toEqual({ media: "7", time: "30", page: "", place: "1/1", marks: "1,2" });
  open("סימנייה ב");
  expect(windowShows()).toEqual({ media: "7", time: "90", page: "", place: "2/2", marks: "1,2" });
  open("סימנייה א");
  expect(windowShows()).toMatchObject({ time: "30", place: "1/2" });
  open("סימנייה ג");
  expect(windowShows()).toEqual({ media: "9", time: "", page: "4", place: "3/3", marks: "3" });
});

test("the arrows walk the trail, and are absent at its ends", async () => {
  await renderNotebook();
  open("סימנייה א");
  open("סימנייה ב");
  expect(screen.queryByText("next")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("prev"));
  expect(windowShows()).toMatchObject({ time: "30", place: "1/2" });
  expect(screen.queryByText("prev")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("next"));
  expect(windowShows()).toMatchObject({ time: "90", place: "2/2" });
});

test("the X puts the window away and keeps the trail", async () => {
  await renderNotebook();
  open("סימנייה א");
  open("סימנייה ב");
  open("סימנייה ג");
  fireEvent.click(screen.getByText("x"));
  expect(windowShows()).toBeNull();
  open("סימנייה ב");
  expect(windowShows()).toMatchObject({ time: "90", place: "2/3" });
});

test("closing the one on screen lands on the next, or the one before at the end", async () => {
  await renderNotebook();
  open("סימנייה א");
  open("סימנייה ב");
  open("סימנייה ג");
  fireEvent.click(screen.getByText("prev"));
  fireEvent.click(screen.getByText("close-current"));
  expect(windowShows()).toMatchObject({ media: "9", place: "2/2" });
  fireEvent.click(screen.getByText("close-current"));
  expect(windowShows()).toMatchObject({ time: "30", place: "1/1" });
  fireEvent.click(screen.getByText("close-current"));
  expect(windowShows()).toBeNull();
});

test("closing everything ends the run", async () => {
  await renderNotebook();
  open("סימנייה א");
  open("סימנייה ב");
  fireEvent.click(screen.getByText("close-all"));
  expect(windowShows()).toBeNull();
  open("סימנייה ב");
  expect(windowShows()).toMatchObject({ time: "90", place: "1/1" });
});
