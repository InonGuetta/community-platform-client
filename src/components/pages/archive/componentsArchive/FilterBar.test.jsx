// @vitest-environment jsdom
import { test, expect, vi, describe } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterBar from "./FilterBar";

// What the type toggle DRAWS, which is what the user reads the mechanism from.
// Under "הכל" every type's button used to be drawn pressed as well, so the first
// press on one looked like it should pick it and instead took it out.

const setup = (selectedTypes) => {
  const onToggleType = vi.fn();
  const onPressAllTypes = vi.fn();
  render(
    <FilterBar
      selectedTypes={selectedTypes}
      onToggleType={onToggleType}
      onPressAllTypes={onPressAllTypes}
      onSearch={vi.fn()}
    />
  );
  // The toggle lives in the collapsible panel.
  fireEvent.click(screen.getByRole("button", { name: "סינון" }));
  const pressed = (name) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
  return { onToggleType, onPressAllTypes, pressed };
};

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

test("each button reports its own press", () => {
  const { onToggleType, onPressAllTypes } = setup([]);
  fireEvent.click(screen.getByRole("button", { name: "שמע" }));
  expect(onToggleType).toHaveBeenCalledWith("audio");
  fireEvent.click(screen.getByRole("button", { name: "הכל" }));
  expect(onPressAllTypes).toHaveBeenCalled();
});

describe("the sort menu", () => {
  const renderBar = (props = {}) => {
    const onSortChange = vi.fn();
    render(<FilterBar onSearch={vi.fn()} onSortChange={onSortChange} {...props} />);
    return { onSortChange };
  };

  // Outside the collapsible panel: nothing has to be opened to reach it.
  test("is on the page without opening the filter panel, showing newest first", () => {
    renderBar();
    expect(screen.getByRole("combobox", { name: /^מיון/ })).toHaveTextContent("החדשים ביותר");
  });

  test("shows the order it is given", () => {
    renderBar({ sortOrder: "liked" });
    expect(screen.getByRole("combobox", { name: /^מיון/ })).toHaveTextContent("הכי אהובים");
  });

  test("offers the five orders, and reports the one chosen", () => {
    const { onSortChange } = renderBar();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /^מיון/ }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "החדשים ביותר", "הישנים ביותר", "שם השיעור (א–ת)", "שם המרצה (א–ת)", "הכי אהובים",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "שם המרצה (א–ת)" }));
    expect(onSortChange).toHaveBeenCalledWith("creator");
  });
});

describe("the length field", () => {
  const openPanel = (props = {}) => {
    const onDurationFilter = vi.fn();
    render(<FilterBar onSearch={vi.fn()} onDurationFilter={onDurationFilter} {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "סינון" }));
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

  test("a chosen range counts on the filter badge", () => {
    render(<FilterBar onSearch={vi.fn()} durationRange="short" />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
