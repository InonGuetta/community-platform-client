// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Reaches for the store; what it does is not what this file is about.
vi.mock("../DownloadMenu/DownloadMenu", () => ({
  default: () => <div data-testid="download-menu" />,
}));

import MediaCard from "./MediaCard";

// The length the archive filters by, shown on the card it filters — so the
// number a range was chosen against is the number the reader can see.

const base = { id: 1, title: "שיעור", creator_name: "כללי", tags: [], like_count: 0, is_published: true };

test("a recording shows how long it runs", () => {
  render(<MediaCard item={{ ...base, media_type: "audio", duration_seconds: 967 }} onView={vi.fn()} />);
  expect(screen.getByLabelText("אורך: 16 דק׳")).toBeInTheDocument();
});

test("a recording whose length was never measured shows no length", () => {
  render(<MediaCard item={{ ...base, media_type: "video", duration_seconds: null }} onView={vi.fn()} />);
  expect(screen.queryByLabelText(/^אורך:/)).not.toBeInTheDocument();
});

// A book has no length, whatever the row happens to hold.
test("a book shows no length", () => {
  render(<MediaCard item={{ ...base, media_type: "text", duration_seconds: 500 }} onView={vi.fn()} />);
  expect(screen.queryByLabelText(/^אורך:/)).not.toBeInTheDocument();
});

// The lecturer's name leads to their page (PRD ATTR-10) — without also opening
// the lesson, since the whole card is a button that does that.
test("the lecturer's name opens their page, and only that", () => {
  const onView = vi.fn();
  const onOpenCreator = vi.fn();
  render(<MediaCard item={{ ...base, media_type: "audio", creator_name: "הרב כהן" }} onView={onView} onOpenCreator={onOpenCreator} />);
  fireEvent.click(screen.getByRole("button", { name: "לכל השיעורים של הרב כהן" }));
  expect(onOpenCreator).toHaveBeenCalledWith("הרב כהן");
  expect(onView).not.toHaveBeenCalled();
});

test("an unattributed lesson's name leads nowhere, and neither does one on the lecturer's own page", () => {
  const { unmount } = render(<MediaCard item={{ ...base, media_type: "audio", creator_name: "כללי" }} onView={vi.fn()} onOpenCreator={vi.fn()} />);
  expect(screen.queryByRole("button", { name: /לכל השיעורים של/ })).toBeNull();
  unmount();
  render(<MediaCard item={{ ...base, media_type: "audio", creator_name: "הרב כהן" }} onView={vi.fn()} />);
  expect(screen.queryByRole("button", { name: /לכל השיעורים של/ })).toBeNull();
});
