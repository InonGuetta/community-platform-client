// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Reaches for the store; what it does is not what this file is about.
vi.mock("../../../features/DownloadMenu/DownloadMenu", () => ({
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
