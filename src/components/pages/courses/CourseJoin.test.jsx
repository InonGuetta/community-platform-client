// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import coursesReducer from "../../../store/slicesAndThunks/coursesSlice/coursesSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { coursesApi } from "../../../api/coursesApi";
import MyCoursesPage from "./MyCoursesPage";
import JoinCodePanel from "./componentsCourses/JoinCodePanel";
import { joinLink } from "./componentsCourses/useJoinCodePanel";

// Joining a course by its code (PRD ROST-9): the student types it — or follows
// the lecturer's link — and a request goes to the lecturer, who approves it.
// The API is the only thing replaced.

vi.mock("../../../api/coursesApi", () => ({
  coursesApi: {
    getMine: vi.fn(),
    getMyJoinRequests: vi.fn(),
    join: vi.fn(),
    cancelJoinRequest: vi.fn(),
    getJoinRequests: vi.fn(),
    createJoinCode: vi.fn(),
    removeJoinCode: vi.fn(),
    decideJoinRequest: vi.fn(),
    getStudents: vi.fn(),
  },
}));

const apiError = (code, status = 404) => {
  const err = new Error(code);
  err.response = { status, data: { code, message: code } };
  return err;
};

const makeStore = (courses = []) =>
  configureStore({
    reducer: { auth: authReducer, courses: coursesReducer, notification: notificationReducer },
    preloadedState: { courses: { ...coursesReducer(undefined, { type: "init" }), items: courses } },
  });

// Where the page is now, so a test can see the code taken off the address.
const Address = () => <div data-testid="address">{useLocation().search}</div>;

const renderMyCourses = (path = "/my-courses") =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/my-courses" element={<><MyCoursesPage /><Address /></>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  coursesApi.getMine.mockResolvedValue([]);
  coursesApi.getMyJoinRequests.mockResolvedValue([]);
  coursesApi.getJoinRequests.mockResolvedValue([]);
});

describe("the student's side", () => {
  it("sends a code and says the request went to the lecturer", async () => {
    coursesApi.join.mockResolvedValue({ status: "pending", course: { id: 4, title: "גמרא", lecturer_name: "הרב כהן" } });
    renderMyCourses();
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole("button", { name: "הצטרפות לקורס" }))[0]);
    await user.type(screen.getByLabelText("קוד הצטרפות"), "abc234");
    coursesApi.getMyJoinRequests.mockResolvedValue([{ id: 31, course_title: "גמרא", lecturer_name: "הרב כהן" }]);
    await user.click(screen.getByRole("button", { name: "שליחת בקשה" }));

    expect(coursesApi.join).toHaveBeenCalledWith("ABC234");
    expect(await screen.findByText(/נשלחה/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "סגירה" }));
    const waiting = (await screen.findByText("ממתינים לאישור המרצה")).parentElement;
    expect(within(waiting).getByText("גמרא")).toBeInTheDocument();
  });

  it("says in Hebrew why a code did not work", async () => {
    coursesApi.join.mockRejectedValue(apiError("JOIN_CODE_NOT_FOUND"));
    renderMyCourses();
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: "הצטרפות לקורס" }))[0]);
    await user.type(screen.getByLabelText("קוד הצטרפות"), "ZZZZZZ");
    await user.click(screen.getByRole("button", { name: "שליחת בקשה" }));
    expect(await screen.findByText(/אין קורס פתוח עם הקוד הזה/)).toBeInTheDocument();
  });

  // The lecturer's shared link.
  it("opens with the code from the link already typed, and takes it off the address", async () => {
    renderMyCourses("/my-courses?join=abc234");
    expect(await screen.findByLabelText("קוד הצטרפות")).toHaveValue("ABC234");
    await waitFor(() => expect(screen.getByTestId("address")).toHaveTextContent(/^$/));
  });

  it("withdraws a request still waiting", async () => {
    coursesApi.getMyJoinRequests.mockResolvedValue([{ id: 31, course_title: "גמרא", lecturer_name: "הרב כהן" }]);
    coursesApi.cancelJoinRequest.mockResolvedValue(undefined);
    renderMyCourses();
    await userEvent.setup().click(await screen.findByRole("button", { name: "ביטול הבקשה" }));
    expect(coursesApi.cancelJoinRequest).toHaveBeenCalledWith(31);
    await waitFor(() => expect(screen.queryByText("ממתינים לאישור המרצה")).toBeNull());
  });
});

describe("the lecturer's side", () => {
  const COURSE = { id: 4, title: "גמרא", lecturer_id: 2, join_code: null, pending_join_count: 0, student_count: 0 };

  const renderPanel = (course) => {
    const store = makeStore([course]);
    const Panel = () => {
      // The panel reads the course as the store holds it, so a new code shows.
      const live = store.getState().courses.items[0];
      return <JoinCodePanel course={live} />;
    };
    const view = render(
      <Provider store={store}>
        <Panel />
      </Provider>
    );
    store.subscribe(() => view.rerender(<Provider store={store}><Panel /></Provider>));
    return store;
  };

  it("offers a code where there is none, and shows it once made", async () => {
    coursesApi.createJoinCode.mockResolvedValue({ joinCode: "XYZ789" });
    renderPanel(COURSE);
    await userEvent.setup().click(screen.getByRole("button", { name: "יצירת קוד" }));
    expect(await screen.findByTestId("join-code")).toHaveTextContent("XYZ789");
    expect(coursesApi.createJoinCode).toHaveBeenCalledWith(4);
  });

  it("asks before replacing a code that is already out", async () => {
    coursesApi.createJoinCode.mockResolvedValue({ joinCode: "NEW234" });
    renderPanel({ ...COURSE, join_code: "OLD234" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "קוד חדש" }));
    expect(coursesApi.createJoinCode).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/יפסיק לעבוד מיד/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "יצירת קוד חדש" }));
    expect(await screen.findByTestId("join-code")).toHaveTextContent("NEW234");
  });

  it("lists who is waiting, and approves and refuses them", async () => {
    coursesApi.getJoinRequests.mockResolvedValue([
      { id: 31, user_id: 7, display_name: "דנה", email: "d@example.com", created_at: "2026-11-02T10:00:00Z" },
      { id: 32, user_id: 8, display_name: "יוסי", email: "y@example.com", created_at: "2026-11-02T11:00:00Z" },
    ]);
    coursesApi.decideJoinRequest.mockResolvedValue({});
    coursesApi.getStudents.mockResolvedValue([{ id: 7 }]);
    const store = renderPanel({ ...COURSE, join_code: "ABC234" });
    const user = userEvent.setup();

    expect(await screen.findByText("2 בקשות ממתינות")).toBeInTheDocument();
    const dana = screen.getByText("דנה").closest("div").parentElement;
    await user.click(within(dana).getByRole("button", { name: "אישור" }));
    expect(coursesApi.decideJoinRequest).toHaveBeenCalledWith(4, 31, true);
    await waitFor(() => expect(screen.queryByText("דנה")).toBeNull());
    // Approving filled the roster and the count the course's header shows.
    expect(store.getState().courses.studentsByCourse[4]).toEqual([{ id: 7 }]);
    expect(store.getState().courses.items[0]).toMatchObject({ student_count: 1, pending_join_count: 1 });

    await user.click(screen.getByRole("button", { name: "דחייה" }));
    expect(coursesApi.decideJoinRequest).toHaveBeenLastCalledWith(4, 32, false);
  });

  it("reads the queue again when another tab already answered", async () => {
    coursesApi.getJoinRequests.mockResolvedValue([{ id: 31, user_id: 7, display_name: "דנה", email: "d@example.com", created_at: "2026-11-02T10:00:00Z" }]);
    coursesApi.decideJoinRequest.mockRejectedValue(apiError("JOIN_REQUEST_DECIDED", 409));
    renderPanel({ ...COURSE, join_code: "ABC234" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "אישור" }));
    await waitFor(() => expect(coursesApi.getJoinRequests).toHaveBeenCalledTimes(2));
  });

  it("builds the link a lecturer shares", () => {
    expect(joinLink("ABC234", "https://app.test")).toBe("https://app.test/my-courses?join=ABC234");
  });
});
