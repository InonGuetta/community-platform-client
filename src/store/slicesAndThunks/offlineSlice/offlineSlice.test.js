import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import offlineReducer from "./offlineSlice";
import notificationReducer from "../notificationSlice";
import { saveForOffline, cancelOfflineSave, loadOfflineLessons, claimOfflineLessons } from "./offlineGet";
import { removeOfflineLesson, clearOfflineLessons } from "./offlineDelete";
import { mediaApi } from "../../../api/mediaApi";
import { fakeCaches, fakeStorage } from "../../../utilities/offlineStore.fakes";
import { offlineFile } from "../../../utilities/offlineStore";

// Saving a lesson for listening with no network (PRD MOB-2), through the store.

const makeStore = () => configureStore({ reducer: { offline: offlineReducer, notification: notificationReducer } });
const lesson = { id: 9, title: "פרשת השבוע", media_type: "audio", creator_name: "הרב כהן" };
const toasts = (store) => JSON.stringify(store.getState().notification);

describe("saving a lesson for offline listening", () => {
  beforeEach(() => {
    vi.stubGlobal("caches", fakeCaches());
    vi.stubGlobal("localStorage", fakeStorage());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows progress while it downloads, then lists the lesson", async () => {
    const store = makeStore();
    let release;
    vi.spyOn(mediaApi, "fetchForListening").mockImplementation(async (_media, { onProgress }) => {
      onProgress(50, 200);
      await new Promise((resolve) => { release = resolve; });
      onProgress(200, 200);
      return new Blob(["x".repeat(200)], { type: "audio/mpeg" });
    });

    const running = store.dispatch(saveForOffline(lesson));
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    expect(store.getState().offline.progress[9]).toEqual({ received: 50, total: 200, title: "פרשת השבוע" });

    release();
    await running;
    expect(store.getState().offline.progress[9]).toBeUndefined();
    expect(store.getState().offline.items.map((i) => i.id)).toEqual([9]);
    expect(await (await offlineFile(9)).text()).toHaveLength(200);
    expect(toasts(store)).toContain("נשמר להאזנה");
  });

  it("does not start a second download of the same lesson", async () => {
    const store = makeStore();
    let release;
    const fetcher = vi.spyOn(mediaApi, "fetchForListening").mockImplementation(async () => {
      await new Promise((resolve) => { release = resolve; });
      return new Blob(["a"]);
    });
    const first = store.dispatch(saveForOffline(lesson));
    await store.dispatch(saveForOffline(lesson));
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    release();
    await first;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("ends quietly when the reader cancels it", async () => {
    const store = makeStore();
    vi.spyOn(mediaApi, "fetchForListening").mockImplementation((_media, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })
    );
    const running = store.dispatch(saveForOffline(lesson));
    await vi.waitFor(() => expect(store.getState().offline.progress[9]).toBeDefined());
    cancelOfflineSave(9);
    const result = await running;
    expect(result.payload).toEqual({ code: "ABORTED" });
    expect(store.getState().offline.progress[9]).toBeUndefined();
    expect(store.getState().offline.items).toEqual([]);
    expect(toasts(store)).not.toContain("error");
  });

  it("says plainly when the device is full", async () => {
    const store = makeStore();
    vi.spyOn(mediaApi, "fetchForListening").mockResolvedValue(new Blob(["a"]));
    const full = fakeCaches();
    full.open = async () => ({ put: async () => { throw Object.assign(new Error("full"), { name: "QuotaExceededError" }); } });
    vi.stubGlobal("caches", full);

    const result = await store.dispatch(saveForOffline(lesson));
    expect(result.payload.code).toBe("STORAGE_FULL");
    expect(toasts(store)).toContain("אין מספיק מקום");
    expect(store.getState().offline.items).toEqual([]);
  });

  it("explains a busy server when a video's audio cannot be prepared now", async () => {
    const store = makeStore();
    vi.spyOn(mediaApi, "fetchForListening").mockRejectedValue(Object.assign(new Error("busy"), { status: 429 }));
    await store.dispatch(saveForOffline({ ...lesson, media_type: "video" }));
    expect(toasts(store)).toContain("השרת עסוק");
  });

  it("loads, claims, removes and clears through the same list", async () => {
    const store = makeStore();
    vi.spyOn(mediaApi, "fetchForListening").mockResolvedValue(new Blob(["a"]));
    await store.dispatch(claimOfflineLessons(1));
    await store.dispatch(saveForOffline(lesson));
    await store.dispatch(saveForOffline({ ...lesson, id: 10 }));
    await store.dispatch(loadOfflineLessons());
    expect(store.getState().offline.items.map((i) => i.id)).toEqual([10, 9]);
    expect(store.getState().offline.loaded).toBe(true);

    await store.dispatch(removeOfflineLesson(10));
    expect(store.getState().offline.items.map((i) => i.id)).toEqual([9]);

    // Another user on this device: the first one's lessons are gone.
    await store.dispatch(claimOfflineLessons(2));
    expect(store.getState().offline.items).toEqual([]);

    await store.dispatch(saveForOffline(lesson));
    await store.dispatch(clearOfflineLessons());
    expect(store.getState().offline.items).toEqual([]);
  });
});

describe("fetching a lesson's bytes", () => {
  afterEach(() => vi.unstubAllGlobals());

  // A video is kept as its audio — the server's extraction route, not the video.
  it("asks for the audio of a video and the file of an audio lesson, and reports progress", async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(["abcd"]), { headers: { "Content-Length": "4", "Content-Type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    const seen = [];
    const blob = await mediaApi.fetchForListening({ id: 3, media_type: "video" }, { onProgress: (r, t) => seen.push([r, t]) });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/media/3/download/audio");
    expect(blob.size).toBe(4);
    expect(blob.type).toBe("audio/mpeg");
    expect(seen.at(-1)).toEqual([4, 4]);

    await mediaApi.fetchForListening({ id: 4, media_type: "audio" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/media/4/download");
  });

  it("fails with the status when the server refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    await expect(mediaApi.fetchForListening({ id: 3, media_type: "audio" })).rejects.toMatchObject({ status: 403 });
  });
});
