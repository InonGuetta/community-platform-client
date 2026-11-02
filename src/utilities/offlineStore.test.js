import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OFFLINE_CACHE,
  offlineFileKey,
  readIndex,
  writeIndex,
  offlineEntry,
  withEntry,
  withoutEntry,
  withPosition,
  storeOffline,
  removeOffline,
  clearOffline,
  claimOffline,
  reconcileOffline,
  offlineFile,
  saveOfflinePosition,
  offlinePosition,
  isQuotaError,
  formatBytes,
  percentOf,
} from "./offlineStore";
import { fakeCaches, fakeStorage } from "./offlineStore.fakes";

// Lessons kept on the device for listening with no network (PRD MOB-2).

const lesson = (id, extra = {}) => ({ id, title: `שיעור ${id}`, media_type: "audio", creator_name: "הרב כהן", ...extra });

describe("the list of saved lessons", () => {
  it("reads as empty when nothing — or nothing sensible — is stored", () => {
    expect(readIndex(fakeStorage())).toEqual({ ownerId: null, items: [] });
    const storage = fakeStorage();
    storage.setItem("offlineMedia:v1", "{not json");
    expect(readIndex(storage)).toEqual({ ownerId: null, items: [] });
    expect(readIndex(null)).toEqual({ ownerId: null, items: [] });
  });

  it("survives storage that throws", () => {
    const hostile = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readIndex(hostile).items).toEqual([]);
    expect(() => writeIndex({ ownerId: 1, items: [] }, hostile)).not.toThrow();
  });

  it("round-trips, newest first, one entry per lesson", () => {
    const storage = fakeStorage();
    let index = withEntry({ ownerId: 7, items: [] }, offlineEntry(lesson(1), 100, 1000));
    index = withEntry(index, offlineEntry(lesson(2), 200, 2000));
    index = withEntry(index, offlineEntry(lesson(1), 150, 3000));
    writeIndex(index, storage);
    const back = readIndex(storage);
    expect(back.ownerId).toBe(7);
    expect(back.items.map((i) => [i.id, i.size])).toEqual([[1, 150], [2, 200]]);
  });

  it("copies only what the page shows, at the moment of saving", () => {
    const entry = offlineEntry(lesson(3, { course_title: "גמרא", duration_seconds: 3600, transcript: "x".repeat(10) }), 42, Date.UTC(2026, 10, 2));
    expect(entry).toEqual({
      id: 3, title: "שיעור 3", creator_name: "הרב כהן", course_title: "גמרא", media_type: "audio",
      duration_seconds: 3600, size: 42, savedAt: "2026-11-02T00:00:00.000Z", position: 0,
    });
  });

  it("forgets one lesson and keeps where another stopped", () => {
    const index = withEntry(withEntry({ ownerId: 1, items: [] }, offlineEntry(lesson(1), 1)), offlineEntry(lesson(2), 1));
    expect(withoutEntry(index, 1).items.map((i) => i.id)).toEqual([2]);
    expect(withPosition(index, 2, 61.7).items.find((i) => i.id === 2).position).toBe(61);
    expect(withPosition(index, 2, -5).items.find((i) => i.id === 2).position).toBe(0);
  });
});

describe("files on the device", () => {
  let caches;
  beforeEach(() => {
    caches = fakeCaches();
    vi.stubGlobal("caches", caches);
    vi.stubGlobal("localStorage", fakeStorage());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a file under its own key and lists it", async () => {
    const items = await storeOffline(lesson(5), new Blob(["abc"], { type: "audio/mpeg" }));
    expect(items.map((i) => i.id)).toEqual([5]);
    expect(caches.stores.get(OFFLINE_CACHE).has(offlineFileKey(5))).toBe(true);
    const blob = await offlineFile(5);
    expect(await blob.text()).toBe("abc");
    expect(await offlineFile(6)).toBeNull();
  });

  it("removes a lesson's file along with its entry", async () => {
    await storeOffline(lesson(5), new Blob(["a"]));
    await storeOffline(lesson(6), new Blob(["b"]));
    expect((await removeOffline(5)).map((i) => i.id)).toEqual([6]);
    expect(await offlineFile(5)).toBeNull();
  });

  it("drops listed lessons whose file the browser evicted", async () => {
    await storeOffline(lesson(5), new Blob(["a"]));
    await storeOffline(lesson(6), new Blob(["b"]));
    caches.stores.get(OFFLINE_CACHE).delete(offlineFileKey(5));
    expect((await reconcileOffline()).map((i) => i.id)).toEqual([6]);
    expect(readIndex().items.map((i) => i.id)).toEqual([6]);
  });

  // A shared computer: one reader must never find another's lessons.
  it("belongs to the user who saved it, and is deleted for anyone else", async () => {
    expect(await claimOffline(1)).toEqual([]);
    await storeOffline(lesson(5), new Blob(["a"]));
    expect((await claimOffline(1)).map((i) => i.id)).toEqual([5]);

    expect(await claimOffline(2)).toEqual([]);
    expect(readIndex().ownerId).toBe(2);
    expect(await offlineFile(5)).toBeNull();
  });

  it("clears everything", async () => {
    await storeOffline(lesson(5), new Blob(["a"]));
    await clearOffline();
    expect(readIndex()).toEqual({ ownerId: null, items: [] });
    expect(caches.stores.has(OFFLINE_CACHE)).toBe(false);
  });

  it("remembers where the listener stopped", async () => {
    await storeOffline(lesson(5), new Blob(["a"]));
    expect(offlinePosition(5)).toBe(0);
    saveOfflinePosition(5, 125.4);
    expect(offlinePosition(5)).toBe(125);
    expect(offlinePosition(99)).toBe(0);
  });
});

describe("words and numbers", () => {
  it("recognises a full disk however the browser says it", () => {
    expect(isQuotaError({ name: "QuotaExceededError" })).toBe(true);
    expect(isQuotaError({ code: 22 })).toBe(true);
    expect(isQuotaError(new Error("Quota exceeded"))).toBe(true);
    expect(isQuotaError(new Error("network"))).toBe(false);
  });

  it("sizes", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(formatBytes(58.4 * 1024 * 1024)).toBe("58 MB");
    expect(formatBytes(2.25 * 1024 ** 3)).toBe("2.3 GB");
  });

  it("progress, or nothing when the size is unknown", () => {
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(250, 200)).toBe(100);
    expect(percentOf(50, null)).toBeNull();
  });
});
