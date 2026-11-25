// @vitest-environment jsdom
import { test, expect, describe, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDockVisibility } from "./useDockVisibility";

const scrollTo = (y) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => { window.dispatchEvent(new Event("scroll")); });
};

describe("the dock while scrolling (UI_UX_FIXES 2.2)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 5000, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  test("is shown at the top, hides on the way down, and returns on the way up", () => {
    const { result } = renderHook(() => useDockVisibility("/archive"));
    expect(result.current).toBe(true);
    scrollTo(5);
    expect(result.current).toBe(true);
    scrollTo(300);
    expect(result.current).toBe(false);
    scrollTo(600);
    expect(result.current).toBe(false);
    scrollTo(550);
    expect(result.current).toBe(true);
  });

  test("is shown at the very bottom, and again after a route change", () => {
    const { result, rerender } = renderHook(({ k }) => useDockVisibility(k), { initialProps: { k: "/a" } });
    scrollTo(300);
    expect(result.current).toBe(false);
    scrollTo(4200);
    expect(result.current).toBe(true);
    scrollTo(1000);
    scrollTo(1300);
    expect(result.current).toBe(false);
    rerender({ k: "/b" });
    expect(result.current).toBe(true);
  });
});
