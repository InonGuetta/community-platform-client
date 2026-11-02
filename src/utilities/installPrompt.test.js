// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { canPromptInstall, promptInstall, subscribeInstall, isIos } from "./installPrompt";

// Installing the app (PRD MOB-1): the browser's event is caught whenever it
// comes, kept, and used once.

describe("the install event", () => {
  it("is kept when the browser fires it, and opens the dialog once", async () => {
    expect(canPromptInstall()).toBe(false);
    const heard = vi.fn();
    const stop = subscribeInstall(heard);

    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(canPromptInstall()).toBe(true);
    expect(heard).toHaveBeenCalled();

    expect(await promptInstall()).toBe("accepted");
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // The event can be used once; after that there is nothing to offer.
    expect(canPromptInstall()).toBe(false);
    expect(await promptInstall()).toBe("unavailable");
    stop();
  });

  it("is dropped once the app is installed", () => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    window.dispatchEvent(event);
    expect(canPromptInstall()).toBe(true);
    window.dispatchEvent(new Event("appinstalled"));
    expect(canPromptInstall()).toBe(false);
  });
});

describe("iOS", () => {
  it("is an iPhone or an iPad — including an iPad that calls itself a Mac", () => {
    expect(isIos({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe(true);
    expect(isIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 0 })).toBe(false);
    expect(isIos({ userAgent: "Mozilla/5.0 (Linux; Android 14)" })).toBe(false);
  });
});
