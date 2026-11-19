// @vitest-environment jsdom
import { test, expect, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import i18n, { changeLanguage } from "../../../../i18n/i18n";
import ArchiveGreeting from "./ArchiveGreeting";

// The archive's "good morning, <name>" — by the reader's clock, in the
// interface language.

afterEach(async () => {
  vi.useRealTimers();
  await changeLanguage("he");
});

const at = (hour) => {
  vi.useRealTimers();
  vi.useFakeTimers({ now: new Date(2026, 10, 17, hour, 30), toFake: ["Date"] });
};

test("greets by the part of the day, with the display name", () => {
  at(8);
  const { container } = render(<ArchiveGreeting name="דנה" />);
  expect(container.textContent).toBe("בוקר טוב, דנה");
  // The name keeps its own direction inside the sentence.
  expect(container.querySelector("bdi")?.textContent).toBe("דנה");
});

test("evening and night, and no name when there is none", () => {
  at(19);
  const { container, unmount } = render(<ArchiveGreeting name="" />);
  expect(container.textContent).toBe("ערב טוב");
  unmount();
  at(23);
  const night = render(<ArchiveGreeting name="Dana" />);
  expect(night.container.textContent).toBe("לילה טוב, Dana");
  expect(screen.getByText("Dana").tagName).toBe("BDI");
});

test("in the interface language", async () => {
  at(14);
  await act(() => changeLanguage("en"));
  const { container } = render(<ArchiveGreeting name="דנה" />);
  expect(container.textContent).toBe("Good afternoon, דנה");
  expect(i18n.language).toBe("en");
});
