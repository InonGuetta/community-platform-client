import { test, expect, describe } from "vitest";
import VideocamIcon from "@mui/icons-material/Videocam";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { iconForMediaType, iconForBookmark } from "./mediaIcons";

// A shiur filmed and a shiur recorded looked identical in a list whose whole job
// is telling them apart — beside a coloured chip that had already said they were
// different, because the icon was picked by asking "is this a book?" and giving
// everything else a play triangle.

describe("the icon for a kind of media", () => {
  test("a video is a camera, not a play triangle", () => {
    expect(iconForMediaType("video")).toBe(VideocamIcon);
    expect(iconForMediaType("video")).not.toBe(PlayCircleOutlineIcon);
  });

  test("a recording keeps the triangle, and a document is a book", () => {
    expect(iconForMediaType("audio")).toBe(PlayCircleOutlineIcon);
    expect(iconForMediaType("text")).toBe(MenuBookIcon);
  });

  // Far more likely to be a type a later build added than a broken row, and a
  // blank in a column of icons reads as breakage.
  test("a type this build does not know still gets an icon", () => {
    expect(iconForMediaType("hologram")).toBe(PlayCircleOutlineIcon);
    expect(iconForMediaType(undefined)).toBe(PlayCircleOutlineIcon);
  });
});

describe("the icon for a bookmark", () => {
  test("a mark on a video is a camera", () => {
    expect(iconForBookmark({ media_type: "video", timestamp_seconds: 248 })).toBe(VideocamIcon);
  });

  test("a mark on a recording is a triangle", () => {
    expect(iconForBookmark({ media_type: "audio", timestamp_seconds: 742 })).toBe(PlayCircleOutlineIcon);
  });

  // Both anchor kinds. See CLAUDE.md: char_position alone has meant "not a
  // recording" once too often, and a mark on a page of the original carries
  // neither a char_position nor a timestamp.
  test("a passage in a book is a book", () => {
    expect(iconForBookmark({ media_type: "text", char_position: 4200, chunk_id: 55 })).toBe(MenuBookIcon);
  });

  test("and so is a place on a page of the original", () => {
    expect(iconForBookmark({ media_type: "text", page_number: 9, rect_x: 0.12 })).toBe(MenuBookIcon);
  });

  // The anchor is asked first for exactly this reason: it is the question that
  // is always answerable, and the join that supplies media_type is not.
  test("a mark in a book whose media type did not arrive is still a book", () => {
    expect(iconForBookmark({ page_number: 9, rect_x: 0.12 })).toBe(MenuBookIcon);
    expect(iconForBookmark({ char_position: 0, chunk_id: 3 })).toBe(MenuBookIcon);
  });
});
