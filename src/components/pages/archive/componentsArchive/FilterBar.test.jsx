// @vitest-environment jsdom
import { test, expect, vi, describe } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterBar from "./FilterBar";
import { activeFilterCount } from "./filterCount";

// The archive's filter panel (mockup 29), opened from the toolbar's "סינון".

describe("the panel", () => {
  // Decision 1: the type is chosen on the toolbar and nowhere else.
  test("holds no type selector", () => {
    render(<FilterBar open />);
    expect(screen.queryByRole("button", { name: "וידאו" })).toBeNull();
    expect(screen.queryByText("סוג תוכן")).toBeNull();
  });

  test("offers clearing only once there is something to clear", () => {
    const onClearAll = vi.fn();
    const { rerender } = render(<FilterBar open onClearAll={onClearAll} />);
    expect(screen.queryByRole("button", { name: "ניקוי הכל" })).toBeNull();
    rerender(<FilterBar open onClearAll={onClearAll} uploadedAfter="2026-01-01" />);
    fireEvent.click(screen.getByRole("button", { name: "ניקוי הכל" }));
    expect(onClearAll).toHaveBeenCalled();
  });
});

describe("the length field", () => {
  const openPanel = (props = {}) => {
    const onDurationFilter = vi.fn();
    render(<FilterBar open onDurationFilter={onDurationFilter} {...props} />);
    return { onDurationFilter };
  };

  test("offers the four ranges and reports the one chosen", () => {
    const { onDurationFilter } = openPanel();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /^אורך השיעור/ }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "הכל", "0–15 דקות", "15–30 דקות", "30–60 דקות", "מעל 60 דקות",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "30–60 דקות" }));
    expect(onDurationFilter).toHaveBeenCalledWith("long");
  });

  test("is not there when a length means nothing", () => {
    openPanel({ lengthOffered: false });
    expect(screen.queryByRole("combobox", { name: /^אורך השיעור/ })).not.toBeInTheDocument();
  });
});

describe("the number on the filter chip", () => {
  test("a chosen range counts, unless a length means nothing", () => {
    expect(activeFilterCount({ durationRange: "short" })).toBe(1);
    expect(activeFilterCount({ durationRange: "short", lengthOffered: false })).toBe(0);
  });

  test("each filter in the panel counts once; a tag branch is one decision", () => {
    expect(
      activeFilterCount({ creatorFilter: "הרב כהן", uploadedAfter: "2026-01-01", uploadedBefore: "2026-02-01", tagIds: [1] })
    ).toBe(4);
    expect(activeFilterCount({})).toBe(0);
  });
});
