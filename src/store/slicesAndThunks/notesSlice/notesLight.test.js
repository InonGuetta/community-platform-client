import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "./notesSlice";
import { fetchNotes, fetchNoteBodies } from "./notesGet";
import { notesApi } from "../../../api/notesApi";

// The notes slice with a light list (PRD NOTE-17): bodies arrive separately,
// and a refetch of the list must not throw away a body that is still current.

vi.mock("../../../api/notesApi", () => ({ notesApi: { list: vi.fn(), byIds: vi.fn() } }));

const makeStore = () => configureStore({ reducer: { notes: notesReducer } });

beforeEach(() => vi.clearAllMocks());

describe("bodies in a light list", () => {
  it("merges fetched bodies into the list, and asks only for the missing ones", async () => {
    notesApi.list.mockResolvedValue([{ id: 1, updated_at: "a" }, { id: 2, updated_at: "a" }]);
    notesApi.byIds.mockResolvedValueOnce([{ id: 1, body: "<p>x</p>" }]);
    const store = makeStore();
    await store.dispatch(fetchNotes());
    await store.dispatch(fetchNoteBodies([1]));
    expect(store.getState().notes.items[0].body).toBe("<p>x</p>");

    notesApi.byIds.mockResolvedValueOnce([{ id: 2, body: "<p>y</p>" }]);
    await store.dispatch(fetchNoteBodies([1, 2]));
    expect(notesApi.byIds).toHaveBeenLastCalledWith([2]);
  });

  it("a refetch keeps a body whose note has not changed", async () => {
    notesApi.list.mockResolvedValue([{ id: 1, updated_at: "a" }]);
    notesApi.byIds.mockResolvedValue([{ id: 1, body: "<p>x</p>" }]);
    const store = makeStore();
    await store.dispatch(fetchNotes());
    await store.dispatch(fetchNoteBodies([1]));
    await store.dispatch(fetchNotes());
    expect(store.getState().notes.items[0].body).toBe("<p>x</p>");
  });

  // Edited elsewhere (another tab, the lesson page): the held body is stale.
  it("a refetch drops a body whose note has changed since", async () => {
    notesApi.list.mockResolvedValueOnce([{ id: 1, updated_at: "a" }]);
    notesApi.byIds.mockResolvedValue([{ id: 1, body: "<p>old</p>" }]);
    const store = makeStore();
    await store.dispatch(fetchNotes());
    await store.dispatch(fetchNoteBodies([1]));
    notesApi.list.mockResolvedValueOnce([{ id: 1, updated_at: "b", preview: "new" }]);
    await store.dispatch(fetchNotes());
    expect(store.getState().notes.items[0].body).toBeUndefined();
    expect(store.getState().notes.items[0].preview).toBe("new");
  });

  it("asks nothing when every body is already held", async () => {
    notesApi.list.mockResolvedValue([{ id: 1, updated_at: "a" }]);
    notesApi.byIds.mockResolvedValue([{ id: 1, body: "" }]);
    const store = makeStore();
    await store.dispatch(fetchNotes());
    await store.dispatch(fetchNoteBodies([1]));
    await store.dispatch(fetchNoteBodies([1]));
    expect(notesApi.byIds).toHaveBeenCalledTimes(1);
  });
});
