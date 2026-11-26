// @vitest-environment jsdom
import { test, expect, describe, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFullscreen } from "./useFullscreen";

// jsdom has no Fullscreen API: each test gives the document the parts it needs.
const setApi = ({ enabled = true, element = null } = {}) => {
  Object.defineProperty(document, "fullscreenEnabled", { value: enabled, configurable: true });
  Object.defineProperty(document, "fullscreenElement", { value: element, configurable: true, writable: true });
};
const enterAs = (element) => {
  document.fullscreenElement = element;
  document.dispatchEvent(new Event("fullscreenchange"));
};

afterEach(() => {
  delete document.fullscreenEnabled;
  delete document.fullscreenElement;
  delete document.exitFullscreen;
});

describe("useFullscreen", () => {
  test("not supported: no button to show, and toggling does nothing", () => {
    setApi({ enabled: false });
    const request = vi.fn(() => Promise.resolve());
    document.documentElement.requestFullscreen = request;
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.supported).toBe(false);
    act(() => result.current.toggle());
    expect(request).not.toHaveBeenCalled();
  });

  test("the page: in through the document's root, out through exitFullscreen", () => {
    setApi();
    const request = vi.fn(() => Promise.resolve());
    const exit = vi.fn(() => Promise.resolve());
    document.documentElement.requestFullscreen = request;
    document.exitFullscreen = exit;
    const { result } = renderHook(() => useFullscreen());

    act(() => result.current.toggle());
    expect(request).toHaveBeenCalledTimes(1);
    act(() => enterAs(document.documentElement));
    expect(result.current.active).toBe(true);

    act(() => result.current.toggle());
    expect(exit).toHaveBeenCalledTimes(1);
    act(() => enterAs(null));
    expect(result.current.active).toBe(false);
  });

  test("a target: only that element on the screen counts as active", () => {
    setApi();
    const stage = document.createElement("div");
    stage.requestFullscreen = vi.fn(() => Promise.resolve());
    const ref = { current: stage };
    const { result } = renderHook(() => useFullscreen(ref));

    act(() => result.current.toggle());
    expect(stage.requestFullscreen).toHaveBeenCalledTimes(1);
    act(() => enterAs(document.createElement("div")));
    expect(result.current.active).toBe(false);
    act(() => enterAs(stage));
    expect(result.current.active).toBe(true);
  });

  test("a refused request is swallowed", async () => {
    setApi();
    document.documentElement.requestFullscreen = vi.fn(() => Promise.reject(new Error("no gesture")));
    const { result } = renderHook(() => useFullscreen());
    await act(async () => result.current.toggle());
    expect(result.current.active).toBe(false);
  });
});
