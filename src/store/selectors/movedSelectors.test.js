import { test, expect } from "vitest";
import { selectInboxItems, selectInboxUnread, selectPendingRoleRequests } from "./inboxSelectors";
import { selectUiState, selectUploadProgress } from "./uiSelectors";
import { selectNotesState } from "./notesSelectors";
import { selectLikedIds } from "./likesSelectors";
import { selectBookmarksState } from "./bookmarksSelectors";
import { selectMyStudents, selectMyCoursesStatus, selectMyJoinRequests, selectJoinRequestsFor } from "./coursesSelectors";
import { selectUpcomingSessions } from "./sessionsSelectors";

// Selectors that were written inline in the hooks that read them, now named
// here. Each must answer what its inline body did — the same value, and for the
// whole-slice ones the same object, so a screen re-renders exactly as before.

test("the inbox, and its defaults when the store has no inbox at all", () => {
  const inbox = { items: [{ id: 1 }], unread: 2, pendingRoleRequests: 3 };
  expect(selectInboxItems({ inbox })).toBe(inbox.items);
  expect(selectInboxUnread({ inbox })).toBe(2);
  expect(selectPendingRoleRequests({ inbox })).toBe(3);

  expect(selectInboxItems({})).toEqual([]);
  // One empty array, not a new one per call — useSelector compares by reference.
  expect(selectInboxItems({})).toBe(selectInboxItems({ inbox: {} }));
  expect(selectInboxUnread({})).toBe(0);
  expect(selectPendingRoleRequests({})).toBeNull();
});

test("whole slices are handed over as they are", () => {
  const state = { ui: { isUploadOpen: true, uploadProgress: 40 }, notes: { items: [] }, bookmarks: { items: [] } };
  expect(selectUiState(state)).toBe(state.ui);
  expect(selectUploadProgress(state)).toBe(40);
  expect(selectNotesState(state)).toBe(state.notes);
  expect(selectBookmarksState(state)).toBe(state.bookmarks);
});

test("courses, likes and sessions read the fields the hooks read", () => {
  const courses = {
    myStudents: [{ id: 1 }], myCoursesStatus: "succeeded", myJoinRequests: [{ id: 2 }],
    joinRequestsByCourse: { 5: [{ id: 3 }] },
  };
  const state = { courses, likes: { ids: [7] }, sessions: { upcoming: [{ id: 9 }] } };
  expect(selectMyStudents(state)).toBe(courses.myStudents);
  expect(selectMyCoursesStatus(state)).toBe("succeeded");
  expect(selectMyJoinRequests(state)).toBe(courses.myJoinRequests);
  expect(selectJoinRequestsFor(5)(state)).toBe(courses.joinRequestsByCourse[5]);
  expect(selectJoinRequestsFor(6)(state)).toBeUndefined();
  expect(selectLikedIds(state)).toBe(state.likes.ids);
  expect(selectUpcomingSessions(state)).toBe(state.sessions.upcoming);
});
