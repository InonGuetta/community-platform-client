// @vitest-environment jsdom
import { test, expect, vi, describe } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ArchiveToolbar from "./ArchiveToolbar";

// The archive's toolbar (decision 1): the type chips — the only place a type
// is chosen — the search, the order, and the chip that opens the filter panel.

describe("the type chips", () => {
  // What the chips DRAW, which is what the user reads the mechanism from.
  // Under "הכל" every type used to be drawn pressed as well, so the first press
  // on one looked like it should pick it and instead took it out.
  const setup = (selectedTypes) => {
    const onToggleType = vi.fn();
    const onPressAllTypes = vi.fn();
    render(<ArchiveToolbar selectedTypes={selectedTypes} onToggleType={onToggleType} onPressAllTypes={onPressAllTypes} onSearch={vi.fn()} />);
    const pressed = (name) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
    return { onToggleType, onPressAllTypes, pressed };
  };

  test("are on the toolbar, with no panel to open first", () => {
    setup([]);
    expect(screen.getByRole("group", { name: "סוג תוכן" })).toBeInTheDocument();
  });

  test("under הכל, only הכל is pressed", () => {
    const { pressed } = setup([]);
    expect(pressed("הכל")).toBe("true");
    expect(pressed("וידאו")).toBe("false");
    expect(pressed("שמע")).toBe("false");
    expect(pressed("קריאה")).toBe("false");
  });

  test("with types chosen, exactly those are pressed, and הכל is not", () => {
    const { pressed } = setup(["video", "text"]);
    expect(pressed("הכל")).toBe("false");
    expect(pressed("וידאו")).toBe("true");
    expect(pressed("שמע")).toBe("false");
    expect(pressed("קריאה")).toBe("true");
  });

  test("each chip reports its own press", () => {
    const { onToggleType, onPressAllTypes } = setup([]);
    fireEvent.click(screen.getByRole("button", { name: "שמע" }));
    expect(onToggleType).toHaveBeenCalledWith("audio");
    fireEvent.click(screen.getByRole("button", { name: "הכל" }));
    expect(onPressAllTypes).toHaveBeenCalled();
  });
});

describe("the sort chip", () => {
  const renderBar = (props = {}) => {
    const onSortChange = vi.fn();
    render(<ArchiveToolbar onSearch={vi.fn()} onSortChange={onSortChange} {...props} />);
    return { onSortChange };
  };

  test("says the order, newest first by default", () => {
    renderBar();
    expect(screen.getByRole("button", { name: "מיון: החדשים ביותר" })).toHaveTextContent("החדשים ביותר");
  });

  test("shows the order it is given", () => {
    renderBar({ sortOrder: "liked" });
    expect(screen.getByRole("button", { name: /^מיון/ })).toHaveTextContent("הכי אהובים");
  });

  test("offers the five orders, marks the current one, and reports the one chosen", () => {
    const { onSortChange } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: /^מיון/ }));
    const options = screen.getAllByRole("menuitemradio");
    expect(options.map((o) => o.textContent)).toEqual([
      "החדשים ביותר", "הישנים ביותר", "שם השיעור (א–ת)", "שם המרצה (א–ת)", "הכי אהובים",
    ]);
    expect(options[0]).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "שם המרצה (א–ת)" }));
    expect(onSortChange).toHaveBeenCalledWith("creator");
  });
});

describe("the filter chip", () => {
  test("opens the panel and says whether it is open", () => {
    const onToggleFilters = vi.fn();
    const { rerender } = render(<ArchiveToolbar onSearch={vi.fn()} onToggleFilters={onToggleFilters} />);
    const chip = screen.getByRole("button", { name: "סינון" });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(chip);
    expect(onToggleFilters).toHaveBeenCalled();
    rerender(<ArchiveToolbar onSearch={vi.fn()} onToggleFilters={onToggleFilters} filtersOpen />);
    expect(screen.getByRole("button", { name: "סינון" })).toHaveAttribute("aria-expanded", "true");
  });

  // The number is what makes it safe to hide the filters behind a chip.
  test("carries the number of filters the panel holds", () => {
    render(<ArchiveToolbar onSearch={vi.fn()} filterCount={2} />);
    expect(screen.getByRole("button", { name: /^סינון/ })).toHaveTextContent("2");
  });
});
