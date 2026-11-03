// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";
import { coursesApi } from "../../../api/coursesApi";
import CourseTrackPage from "./CourseTrackPage";
import useCourseTrackForLesson, { ADVANCE_AFTER_SECONDS } from "../mediaView/useCourseTrackForLesson";
import { lessonStatus, progressText, placeInTrack, nextAfter, trackPath } from "../../../utilities/courseTrack";

// A course as a track (PRD CRS-1, CRS-2, CRS-3). The API is the only thing
// replaced.

vi.mock("../../../api/coursesApi", () => ({
  coursesApi: { getLessons: vi.fn(), reorderLessons: vi.fn(), getReport: vi.fn() },
}));

const LESSONS = [
  { id: 1, title: "פתיחה", media_type: "audio", duration_seconds: 600, completed_at: "2026-11-01T10:00:00Z", last_position_seconds: 600 },
  { id: 2, title: "המשנה", media_type: "video", duration_seconds: 1200, completed_at: null, last_position_seconds: 125 },
  { id: 3, title: "הספר", media_type: "text", completed_at: null },
  { id: 4, title: "הגמרא", media_type: "audio", duration_seconds: 900, completed_at: null, last_position_seconds: null },
];
const TRACK = (over = {}) => ({
  course: { id: 4, title: "גמרא", lecturer_name: "הרב כהן" },
  lessons: LESSONS,
  summary: { total: 3, completed: 1, nextId: 2 },
  canArrange: false,
  ...over,
});

const Address = () => <div data-testid="where">{useLocation().pathname}</div>;
const store = () => configureStore({ reducer: { notification: notificationReducer } });

const renderTrack = () =>
  render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={["/my-courses/4"]}>
        <Routes>
          <Route path="/my-courses/:id" element={<CourseTrackPage />} />
          <Route path="*" element={<Address />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const REPORT = {
  lessons: [{ id: 1, title: "פתיחה", completedBy: 1 }, { id: 2, title: "המשנה", completedBy: 0 }],
  students: [
    { id: 13, display_name: "דנה", email: "d@example.com", completed: 1, started: 1, lastActivity: "2026-11-02T09:00:00Z",
      cells: { 1: { status: "done", position: 600 }, 2: { status: "started", position: 125 } } },
    { id: 14, display_name: "יוסי", email: "y@example.com", completed: 0, started: 0, lastActivity: null,
      cells: { 1: { status: "none", position: 0 }, 2: { status: "none", position: 0 } } },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  coursesApi.getReport.mockResolvedValue(REPORT);
});

describe("the words and the arithmetic", () => {
  it("names each lesson's state for this reader", () => {
    expect(LESSONS.map(lessonStatus)).toEqual(["done", "started", "book", "new"]);
  });

  it("counts recordings, and says when they are all done", () => {
    expect(progressText({ total: 10, completed: 3 })).toBe("3 מתוך 10 שיעורים הושלמו");
    expect(progressText({ total: 4, completed: 4 })).toBe("כל 4 השיעורים הושלמו");
    expect(progressText({ total: 0, completed: 0 })).toBe("");
  });

  it("finds a lesson's place and the one after it", () => {
    expect(placeInTrack(LESSONS, 3)).toEqual({ index: 3, count: 4 });
    expect(nextAfter(LESSONS, 3).id).toBe(4);
    expect(nextAfter(LESSONS, 4)).toBeNull();
    expect(placeInTrack(LESSONS, 99)).toBeNull();
    expect(trackPath(4)).toBe("/my-courses/4");
  });
});

describe("the course page", () => {
  it("shows progress and carries on from the first unfinished lesson", async () => {
    coursesApi.getLessons.mockResolvedValue(TRACK());
    renderTrack();
    expect(await screen.findByTestId("track-progress")).toHaveTextContent("1 מתוך 3 שיעורים הושלמו");
    expect(screen.getByText("הגעת ל-2:05 · 20:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /להמשיך: המשנה/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/media/2");
  });

  it("tells a student outside the course how to get in", async () => {
    coursesApi.getLessons.mockRejectedValue(Object.assign(new Error("403"), { response: { status: 403 } }));
    renderTrack();
    expect(await screen.findByText(/פתוחים לתלמידים הרשומים אליו/)).toBeInTheDocument();
  });

  it("lets only its lecturer rearrange it, from the keyboard too, and saves the order", async () => {
    coursesApi.getLessons.mockResolvedValue(TRACK({ canArrange: true }));
    coursesApi.reorderLessons.mockResolvedValue({});
    renderTrack();
    const row = await screen.findByLabelText(/^4\. הגמרא/);
    fireEvent.keyDown(row, { key: "ArrowUp" });
    await waitFor(() => expect(coursesApi.reorderLessons).toHaveBeenCalledWith(4, [1, 2, 4, 3]));
    expect(screen.getByLabelText(/^3\. הגמרא/)).toBeInTheDocument();
  });

  it("puts the order back, and says so, when the server refuses it", async () => {
    coursesApi.getLessons.mockResolvedValue(TRACK({ canArrange: true }));
    coursesApi.reorderLessons.mockRejectedValue(new Error("400"));
    renderTrack();
    fireEvent.keyDown(await screen.findByLabelText(/^4\. הגמרא/), { key: "ArrowUp" });
    await waitFor(() => expect(screen.getByLabelText(/^4\. הגמרא/)).toBeInTheDocument());
  });

  // PRD CRS-4.
  it("shows its lecturer who heard what, both ways", async () => {
    coursesApi.getLessons.mockResolvedValue(TRACK({ canArrange: true }));
    renderTrack();
    expect(await screen.findByText("מי שמע מה")).toBeInTheDocument();
    expect(await screen.findByTestId("report-total-13")).toHaveTextContent("1/2");
    expect(screen.getByTestId("report-total-14")).toHaveTextContent("0/2");
    expect(screen.getByText("עוד לא האזין")).toBeInTheDocument();
    expect(screen.getByLabelText("התחיל, הגיע ל-2:05")).toBeInTheDocument();
    expect(coursesApi.getReport).toHaveBeenCalledWith(4);
  });

  it("offers a student no way to rearrange", async () => {
    coursesApi.getLessons.mockResolvedValue(TRACK());
    renderTrack();
    await screen.findByTestId("track-progress");
    expect(screen.queryByLabelText(/אפשר לגרור/)).toBeNull();
    expect(screen.getByText("הגמרא").closest("[draggable]")).toBeNull();
    // Nor the report: it is not asked for at all.
    expect(screen.queryByText("מי שמע מה")).toBeNull();
    expect(coursesApi.getReport).not.toHaveBeenCalled();
  });
});

// ── On the lesson page ──────────────────────────────────────────────────────

describe("moving on when a lesson ends", () => {
  // The hook's latest answer, handed out through a prop: the react-hooks rules
  // refuse a component that writes to anything outside itself while rendering.
  const probe = {};
  const keep = (value) => { probe.api = value; };
  const Probe = ({ media, onValue }) => {
    onValue(useCourseTrackForLesson(media));
    return <Address />;
  };
  const renderLesson = (media) =>
    render(
      <MemoryRouter initialEntries={[`/media/${media.id}`]}>
        <Routes><Route path="*" element={<Probe media={media} onValue={keep} />} /></Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    coursesApi.getLessons.mockResolvedValue(TRACK());
  });
  afterEach(() => vi.useRealTimers());

  it("knows the lesson's place, and goes to the next after the countdown", async () => {
    renderLesson({ id: 1, course_id: 4 });
    await waitFor(() => expect(probe.api.place).toEqual({ index: 1, count: 4 }));
    expect(probe.api.next.id).toBe(2);

    act(() => probe.api.handleEnded());
    expect(probe.api.countdown).toBe(ADVANCE_AFTER_SECONDS);
    await act(async () => { vi.advanceTimersByTime(ADVANCE_AFTER_SECONDS * 1000 + 50); });
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/media/2"));
  });

  it("stays when the listener cancels", async () => {
    renderLesson({ id: 1, course_id: 4 });
    await waitFor(() => expect(probe.api.next?.id).toBe(2));
    act(() => probe.api.handleEnded());
    act(() => probe.api.stopCountdown());
    await act(async () => { vi.advanceTimersByTime(ADVANCE_AFTER_SECONDS * 1000 + 50); });
    expect(screen.getByTestId("where")).toHaveTextContent("/media/1");
    expect(probe.api.countdown).toBeNull();
  });

  // A book is something to sit down to, not to be dropped into by a timer.
  it("offers a book next but does not open it on its own", async () => {
    renderLesson({ id: 2, course_id: 4 });
    await waitFor(() => expect(probe.api.next?.id).toBe(3));
    act(() => probe.api.handleEnded());
    expect(probe.api.countdown).toBeNull();
  });

  it("asks nothing for a lesson in no course, and shows nothing when the course is not the reader's", async () => {
    renderLesson({ id: 9, course_id: null });
    expect(coursesApi.getLessons).not.toHaveBeenCalled();
    coursesApi.getLessons.mockRejectedValue(Object.assign(new Error("403"), { response: { status: 403 } }));
    renderLesson({ id: 9, course_id: 4 });
    await waitFor(() => expect(coursesApi.getLessons).toHaveBeenCalled());
    expect(probe.api.inTrack).toBe(false);
  });
});
