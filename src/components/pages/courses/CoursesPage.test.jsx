// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import coursesReducer from "../../../store/slicesAndThunks/coursesSlice/coursesSlice";
import usersReducer from "../../../store/slicesAndThunks/usersSlice/usersSlice";
import { coursesApi } from "../../../api/coursesApi";
import CoursesPage from "./CoursesPage";

// The course tab as a lecturer sees it: their own courses by default, everybody
// else's one switch away and read-only (ROST-7); a confirmation before anybody
// is removed from a course (ROST-8). The API is the only thing replaced.

vi.mock("../../../api/coursesApi", () => ({
  coursesApi: {
    getAll: vi.fn(),
    getStudents: vi.fn(),
    getMyStudents: vi.fn(),
    unenroll: vi.fn(),
    searchEnrollable: vi.fn(),
  },
}));

const ME = { id: 2, display_name: "הרב לוי", role: "lecturer" };

const COURSES = [
  { id: 10, title: "גמרא", lecturer_id: 2, lecturer_name: "הרב לוי", is_active: true, student_count: 1, media_count: 0 },
  { id: 11, title: "הלכה", lecturer_id: 5, lecturer_name: "הרב כהן", is_active: true, student_count: 3, media_count: 2 },
];

const STUDENT = { id: 7, display_name: "משה", email: "m@example.com", is_active: true, enrolled_at: "2026-10-01T10:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks();
  coursesApi.getAll.mockResolvedValue(COURSES);
  coursesApi.getMyStudents.mockResolvedValue([]);
  coursesApi.getStudents.mockResolvedValue([STUDENT]);
  coursesApi.unenroll.mockResolvedValue(undefined);
});

const renderPage = (user = ME) => {
  const store = configureStore({ reducer: { auth: authReducer, courses: coursesReducer, users: usersReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user } });
  render(
    <Provider store={store}>
      <CoursesPage />
    </Provider>
  );
};

it("shows a lecturer only their own courses until they switch", async () => {
  const user = userEvent.setup();
  renderPage();
  expect(await screen.findByText("גמרא")).toBeTruthy();
  expect(screen.queryByText("הלכה")).toBeNull();

  await user.click(screen.getByRole("button", { name: "כל הקורסים" }));
  expect(screen.getByText("הלכה")).toBeTruthy();
  expect(screen.getByText("צפייה בלבד")).toBeTruthy();
});

// The server answers 403 for a roster the caller does not manage.
it("does not ask for the roster of a colleague's course", async () => {
  const user = userEvent.setup();
  renderPage();
  await screen.findByText("גמרא");
  await user.click(screen.getByRole("button", { name: "כל הקורסים" }));
  await user.click(screen.getByText("הלכה"));
  expect(await screen.findByText("רשימת התלמידים גלויה רק למרצה של הקורס.")).toBeTruthy();
  expect(coursesApi.getStudents).not.toHaveBeenCalled();
});

it("offers an admin no switch — every course is theirs to manage", async () => {
  renderPage({ id: 1, display_name: "מנהל", role: "admin" });
  expect(await screen.findByText("הלכה")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "הקורסים שלי" })).toBeNull();
});

it("asks before removing a student, and removes only on confirmation", async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByText("גמרא"));
  const chip = (await screen.findByText("משה")).closest(".MuiChip-root");
  await user.click(within(chip).getByTestId("CancelIcon"));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/הגישה לשיעורי הקורס תיחסם מיד/)).toBeTruthy();
  expect(coursesApi.unenroll).not.toHaveBeenCalled();

  await user.click(within(dialog).getByRole("button", { name: "ביטול" }));
  expect(coursesApi.unenroll).not.toHaveBeenCalled();

  await user.click(within(chip).getByTestId("CancelIcon"));
  await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "הסרה" }));
  await waitFor(() => expect(coursesApi.unenroll).toHaveBeenCalledWith(10, 7));
  // "My students" spans every course, so it is asked for again — once on
  // opening the page, once after the removal.
  await waitFor(() => expect(coursesApi.getMyStudents).toHaveBeenCalledTimes(2));
});

it("offers a CSV export of a roster that has students", async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByText("גמרא"));
  await screen.findByText("משה");
  expect(screen.getByRole("button", { name: /ייצוא ל.CSV/ })).toBeTruthy();
});
