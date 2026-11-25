// @vitest-environment jsdom
import { test, expect, vi, describe } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

// Reaches for the store; what it offers is DownloadMenu's own test.
vi.mock("../DownloadMenu/DownloadMenu", () => ({
  default: ({ open }) => (open ? <div role="menu" aria-label="download-menu" /> : null),
}));

import { MemoryRouter } from "react-router-dom";
import RawMediaTile from "./MediaTile";

const MediaTile = (props) => (
  <MemoryRouter>
    <RawMediaTile {...props} />
  </MemoryRouter>
);

const base = { id: 1, title: "שיעור", creator_name: "כללי", tags: [], is_published: true, uploader_id: 7, media_type: "audio" };
const admin = { id: 1, role: "admin" };
const student = { id: 9, role: "student" };

const renderTile = (props = {}) => {
  render(<MediaTile item={base} {...props} />);
  return {};
};

describe("what the tile says", () => {
  // The length the archive filters by, on the tile it filters.
  test("a recording's kicker is its type and how long it runs", () => {
    renderTile({ item: { ...base, duration_seconds: 967 } });
    expect(screen.getByText("שמע · 16 דק׳")).toBeInTheDocument();
  });

  test("an unmeasured recording, and any book, show only the type", () => {
    const { unmount } = render(<MediaTile item={{ ...base, media_type: "video", duration_seconds: null }} />);
    expect(screen.getByText("וידאו")).toBeInTheDocument();
    unmount();
    render(<MediaTile item={{ ...base, media_type: "text", duration_seconds: 500 }} />);
    expect(screen.getByText("קריאה")).toBeInTheDocument();
  });

  test("the title is a heading, and only the first tag is shown", () => {
    renderTile({ item: { ...base, tags: ["תנ״ך", "הלכה"] } });
    expect(screen.getByRole("heading", { name: "שיעור" })).toBeInTheDocument();
    expect(screen.getByText("תנ״ך")).toBeInTheDocument();
    expect(screen.queryByText("הלכה")).toBeNull();
  });

  test("no like counter, and no description", () => {
    renderTile({ item: { ...base, like_count: 5, description: "תיאור ארוך" } });
    expect(screen.queryByText("5")).toBeNull();
    expect(screen.queryByText("תיאור ארוך")).toBeNull();
  });

  test("an uploaded picture replaces the generated cover", () => {
    const { unmount } = render(<MediaTile item={base} />);
    expect(screen.getByTestId("cover-art")).toBeInTheDocument();
    unmount();
    const { container } = render(<MediaTile item={{ ...base, thumbnail_url: "/t.jpg" }} />);
    expect(screen.queryByTestId("cover-art")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", "/t.jpg");
  });
});

describe("opening", () => {
  // UI_UX_FIXES 2.3: a real link, so a new tab, a middle click and "copy
  // link" all work; the only <a> in the tile, and the only tab stop but the
  // buttons.
  test("the title is a link to the lesson, and the only link in the tile", () => {
    renderTile();
    const tile = screen.getByRole("article", { name: "שיעור" });
    expect(tile).not.toHaveAttribute("tabindex");
    const links = within(tile).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/media/1");
    expect(links[0]).toHaveTextContent("שיעור");
    expect(tile.querySelector("a a")).toBeNull();
  });

  // PRD ATTR-10 — without also opening the lesson.
  test("the lecturer's name opens their page, and only that", () => {
    const onOpenCreator = vi.fn();
    renderTile({ item: { ...base, creator_name: "הרב כהן" }, onOpenCreator });
    fireEvent.click(screen.getByRole("button", { name: "לכל השיעורים של הרב כהן" }));
    expect(onOpenCreator).toHaveBeenCalledWith("הרב כהן");
  });

  test("an unattributed lesson's name leads nowhere, and neither does one on the lecturer's own page", () => {
    const { unmount } = render(<MediaTile item={base} onOpenCreator={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /לכל השיעורים של/ })).toBeNull();
    unmount();
    render(<MediaTile item={{ ...base, creator_name: "הרב כהן" }} />);
    expect(screen.queryByRole("button", { name: /לכל השיעורים של/ })).toBeNull();
    expect(screen.getByText("הרב כהן")).toBeInTheDocument();
  });
});

describe("the like", () => {
  test("says whether it is pressed, and pressing it likes without opening the lesson", () => {
    const onToggleLike = vi.fn();
    renderTile({ liked: false, onToggleLike });
    const heart = screen.getByRole("button", { name: "אהבתי: שיעור" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(heart);
    expect(onToggleLike).toHaveBeenCalledTimes(1);
  });

  test("is drawn pressed for a liked lesson, and absent with no one to like it", () => {
    const { unmount } = render(<MediaTile item={base} liked onToggleLike={vi.fn()} />);
    expect(screen.getByRole("button", { name: "אהבתי: שיעור" })).toHaveAttribute("aria-pressed", "true");
    unmount();
    render(<MediaTile item={base} />);
    expect(screen.queryByRole("button", { name: /^אהבתי/ })).toBeNull();
  });
});

describe("the ⋯ menu", () => {
  const handlers = () => ({
    onEditDetails: vi.fn(), onEditTags: vi.fn(), onTogglePublish: vi.fn().mockResolvedValue(), onDelete: vi.fn(),
  });
  const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "פעולות עבור שיעור" }));
  const items = () => within(screen.getByRole("menu")).getAllByRole("menuitem").map((i) => i.textContent);

  test("a student gets download, and opening the menu does not open the lesson", () => {
    renderTile({ user: student, showAdmin: true, ...handlers() });
    openMenu();
    expect(items()).toEqual(["הורדה"]);
  });

  test("a manager gets every action, in the spec's order, with delete last", () => {
    renderTile({ user: admin, showAdmin: true, ...handlers() });
    openMenu();
    const texts = items();
    expect(texts[0]).toBe("הורדה");
    expect(texts[1]).toBe("עריכת פרטים");
    expect(texts[2]).toBe("עריכת תגיות");
    expect(texts[3]).toMatch(/^הסתרה מתלמידים/);
    expect(texts[4]).toBe("מחיקה");
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  test("with תצוגת מנהל off a manager sees what a student sees, and no draft badge", () => {
    renderTile({ user: admin, showAdmin: false, item: { ...base, is_published: false }, ...handlers() });
    expect(screen.queryByText("טיוטה")).toBeNull();
    openMenu();
    expect(items()).toEqual(["הורדה"]);
  });

  test("a draft says so to its manager, and the menu offers to publish it", async () => {
    const h = handlers();
    renderTile({ user: admin, showAdmin: true, item: { ...base, is_published: false }, ...h });
    expect(screen.getByText("טיוטה")).toBeInTheDocument();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /^פרסום לתלמידים/ }));
    expect(h.onTogglePublish).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  test("each action reaches the page's handler,", () => {
    const h = handlers();
    renderTile({ user: admin, showAdmin: true, ...h });
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "עריכת פרטים" }));
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "עריכת תגיות" }));
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "מחיקה" }));
    expect(h.onEditDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(h.onEditTags).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(h.onDelete).toHaveBeenCalledWith(1);
  });

  test("download hands over to the download menu", () => {
    renderTile({ user: student });
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "הורדה" }));
    expect(screen.getByRole("menu", { name: "download-menu" })).toBeInTheDocument();
  });
});
