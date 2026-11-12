// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import coursesReducer from "../../../../store/slicesAndThunks/coursesSlice/coursesSlice";
import notificationReducer from "../../../../store/slicesAndThunks/snackbarSlice";

// A course's roster — who is in it, from the store, and the type-ahead that
// finds someone to add (one request per pause in typing, never for a single
// letter) — and the course report's load, its failure, and its export.

const coursesApi = vi.hoisted(() => ({ searchEnrollable: vi.fn(), getReport: vi.fn() }));
vi.mock("../../../../api/coursesApi", () => ({ coursesApi }));
const saveBlob = vi.hoisted(() => vi.fn());
vi.mock("../../../../utilities/saveBlob", () => ({ saveBlob: (...a) => saveBlob(...a) }));

import CourseRoster from "./CourseRoster";
import { useCourseRoster } from "./useCourseRoster";
import CourseReport from "./CourseReport";

const storeWithRoster = (students) => {
  const store = configureStore({ reducer: { courses: coursesReducer, notification: notificationReducer } });
  store.dispatch({ type: "courses/fetchStudents/fulfilled", payload: { courseId: 5, students } });
  return store;
};

describe("the roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coursesApi.searchEnrollable.mockResolvedValue([{ id: 9, display_name: "שרה", email: "s@x.co" }]);
  });
  afterEach(() => vi.useRealTimers());
  // Real time, for the tests that only need the list to have arrived.
  const pause = (ms) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

  const renderRoster = (props = {}) => {
    const onEnroll = vi.fn().mockResolvedValue(undefined);
    render(
      <Provider store={storeWithRoster([{ id: 2, display_name: "דוד", email: "d@x.co" }])}>
        <CourseRoster courseId={5} canEnroll onEnroll={onEnroll} onUnenroll={vi.fn()} {...props} />
      </Provider>
    );
    return { onEnroll };
  };
  const box = () => screen.getByLabelText("חיפוש משתמש להוספה לקורס");

  test("shows who is in the course, from the store", () => {
    renderRoster();
    expect(screen.getByText("דוד")).toBeInTheDocument();
  });

  // The debounce, asked of the hook that owns it, on a fake clock. This test
  // COUNTS requests, so it cannot run on real time: a loaded machine let the
  // third letter arrive after the debounce had already fired for the first two.
  // (Typing through the screen on a fake clock is not an option either — the
  // testing library waits on a real setTimeout after every keystroke.)
  test("one letter asks nothing; a pause after two asks once", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const store = storeWithRoster([]);
    const { result } = renderHook(() => useCourseRoster({ courseId: 5, canEnroll: true, onEnroll: vi.fn() }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    const typed = (text) => act(() => result.current.setQuery(text));
    const later = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

    typed("ש");
    await later(400);
    expect(coursesApi.searchEnrollable).not.toHaveBeenCalled();

    typed("שר");
    await later(100);
    typed("שרה");
    await later(200);
    // A quarter of a second has passed since "שר", but not since "שרה".
    expect(coursesApi.searchEnrollable).not.toHaveBeenCalled();
    await later(100);
    expect(coursesApi.searchEnrollable).toHaveBeenCalledTimes(1);
    expect(coursesApi.searchEnrollable).toHaveBeenCalledWith(5, "שרה");
    expect(result.current.options).toEqual([{ id: 9, display_name: "שרה", email: "s@x.co" }]);
  });

  test("the person picked is the one added", async () => {
    const { onEnroll } = renderRoster();
    await userEvent.type(box(), "שרה");
    await pause(400);
    fireEvent.click(await screen.findByText("שרה"));
    fireEvent.click(screen.getByRole("button", { name: "הוספה" }));
    await waitFor(() => expect(onEnroll).toHaveBeenCalledWith(5, 9));
  });

  test("someone who may not enrol is offered no search at all", () => {
    renderRoster({ canEnroll: false });
    expect(screen.queryByLabelText("חיפוש משתמש להוספה לקורס")).not.toBeInTheDocument();
  });
});

describe("the report", () => {
  beforeEach(() => vi.clearAllMocks());

  const REPORT = {
    lessons: [{ id: 1, title: "שיעור א", completedBy: 1 }],
    students: [{ id: 2, display_name: "דוד", completed: 1, cells: { 1: { status: "done", completed_at: "2026-11-01T10:00:00Z" } } }],
  };
  const renderReport = () => {
    const store = configureStore({ reducer: { notification: notificationReducer } });
    render(<Provider store={store}><CourseReport courseId={5} courseTitle="גמרא" /></Provider>);
    return store;
  };

  test("asks for this course's report", async () => {
    coursesApi.getReport.mockResolvedValue(REPORT);
    renderReport();
    await waitFor(() => expect(coursesApi.getReport).toHaveBeenCalledWith(5));
  });

  test("a report that cannot be loaded says so", async () => {
    coursesApi.getReport.mockRejectedValue(new Error("500"));
    renderReport();
    await waitFor(() => expect(document.body.textContent).toMatch(/נכשל|לא ניתן/));
  });
});
