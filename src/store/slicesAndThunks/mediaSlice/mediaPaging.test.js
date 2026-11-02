import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import mediaReducer from "./mediaSlice";
import { fetchAllMedia, fetchMoreMedia } from "./mediaGet";
import { mediaApi } from "../../../api/mediaApi";

// The archive in pages (PRD ARCH-1), as the store holds it: the first page
// replaces, later pages append, and nothing from an older filter gets in.

vi.mock("../../../api/mediaApi", () => ({ mediaApi: { getAll: vi.fn() } }));

const row = (id) => ({ id, title: `שיעור ${id}` });
const rows = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => row(from + i));

const makeStore = () => configureStore({ reducer: { media: mediaReducer } });

beforeEach(() => vi.clearAllMocks());

describe("the archive in pages", () => {
  it("the first page replaces the list and keeps the cursor and the total", async () => {
    mediaApi.getAll.mockResolvedValueOnce({ items: rows(1, 24), nextCursor: "c24", total: 50 });
    const store = makeStore();
    await store.dispatch(fetchAllMedia({ type: ["audio"] }));
    const { media } = store.getState();
    expect(media.items).toHaveLength(24);
    expect(media.nextCursor).toBe("c24");
    expect(media.total).toBe(50);
    expect(media.filters).toEqual({ type: ["audio"] });
  });

  it("the next page asks with the same filter and the cursor, and appends", async () => {
    mediaApi.getAll
      .mockResolvedValueOnce({ items: rows(1, 24), nextCursor: "c24", total: 30 })
      .mockResolvedValueOnce({ items: rows(25, 30), nextCursor: null });
    const store = makeStore();
    await store.dispatch(fetchAllMedia({ search: "תפילה" }));
    await store.dispatch(fetchMoreMedia());
    expect(mediaApi.getAll).toHaveBeenLastCalledWith({ search: "תפילה" }, { cursor: "c24" });
    const { media } = store.getState();
    expect(media.items.map((r) => r.id)).toEqual(rows(1, 30).map((r) => r.id));
    expect(media.nextCursor).toBeNull();
    // The total stays from the first page; later pages do not carry one.
    expect(media.total).toBe(30);
  });

  // An upload while scrolling shifts the offset by one.
  it("a card that arrives twice is shown once", async () => {
    mediaApi.getAll
      .mockResolvedValueOnce({ items: rows(1, 24), nextCursor: "c24", total: 40 })
      .mockResolvedValueOnce({ items: rows(24, 40), nextCursor: null });
    const store = makeStore();
    await store.dispatch(fetchAllMedia({}));
    await store.dispatch(fetchMoreMedia());
    const ids = store.getState().media.items.map((r) => r.id);
    expect(ids).toHaveLength(40);
    expect(new Set(ids).size).toBe(40);
  });

  it("asks for nothing at the end of the list", async () => {
    mediaApi.getAll.mockResolvedValueOnce({ items: rows(1, 5), nextCursor: null, total: 5 });
    const store = makeStore();
    await store.dispatch(fetchAllMedia({}));
    await store.dispatch(fetchMoreMedia());
    expect(mediaApi.getAll).toHaveBeenCalledTimes(1);
  });

  it("asks for one next page at a time, however often the scroll fires", async () => {
    let release;
    mediaApi.getAll
      .mockResolvedValueOnce({ items: rows(1, 24), nextCursor: "c24", total: 48 })
      .mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const store = makeStore();
    await store.dispatch(fetchAllMedia({}));
    const first = store.dispatch(fetchMoreMedia());
    store.dispatch(fetchMoreMedia());
    store.dispatch(fetchMoreMedia());
    expect(mediaApi.getAll).toHaveBeenCalledTimes(2);
    release({ items: rows(25, 48), nextCursor: null });
    await first;
    expect(store.getState().media.items).toHaveLength(48);
  });

  // The reader scrolls, the next page is in flight, and they change the filter:
  // the late page belongs to the old list and must not be appended to the new.
  it("a page for an older filter is thrown away", async () => {
    let release;
    mediaApi.getAll
      .mockResolvedValueOnce({ items: rows(1, 24), nextCursor: "c24", total: 48 })
      .mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }))
      .mockResolvedValueOnce({ items: [row(900)], nextCursor: null, total: 1 });
    const store = makeStore();
    await store.dispatch(fetchAllMedia({}));
    const late = store.dispatch(fetchMoreMedia());
    await store.dispatch(fetchAllMedia({ search: "אחר" }));
    release({ items: rows(25, 48), nextCursor: "c48" });
    await late;
    const { media } = store.getState();
    expect(media.items.map((r) => r.id)).toEqual([900]);
    expect(media.nextCursor).toBeNull();
  });

  it("an older first page arriving last does not replace a newer one", async () => {
    let releaseOld;
    mediaApi.getAll
      .mockImplementationOnce(() => new Promise((resolve) => { releaseOld = resolve; }))
      .mockResolvedValueOnce({ items: [row(2)], nextCursor: null, total: 1 });
    const store = makeStore();
    const old = store.dispatch(fetchAllMedia({ search: "א" }));
    await store.dispatch(fetchAllMedia({ search: "אב" }));
    releaseOld({ items: [row(1)], nextCursor: null, total: 1 });
    await old;
    expect(store.getState().media.items.map((r) => r.id)).toEqual([2]);
  });
});
