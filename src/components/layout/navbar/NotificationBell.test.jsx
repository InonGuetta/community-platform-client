// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import inboxReducer from "../../../store/slicesAndThunks/inboxSlice/inboxSlice";
import { buildTheme } from "../../../theme/theme";
import { notificationsApi } from "../../../api/notificationsApi";
import Navbar from "./Navbar";

// The bell in the real navbar, against a mocked API: the count, the list, what a
// click does, and the admin's counter on "משתמשים" (PRD NOTIF-4, REG-11).

vi.mock("../../../api/notificationsApi", () => ({
  notificationsApi: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

const NOW = new Date().toISOString();
const ITEMS = [
  { id: 1, type: "processing_done", payload: { mediaId: 9, title: "פרשת השבוע" }, read_at: null, created_at: NOW },
  { id: 2, type: "role_request", payload: { displayName: "דוד", requestedRole: "lecturer" }, read_at: NOW, created_at: NOW },
];

beforeEach(() => {
  vi.clearAllMocks();
  notificationsApi.list.mockResolvedValue({ items: ITEMS, unread: 1 });
  notificationsApi.markRead.mockResolvedValue(undefined);
  notificationsApi.markAllRead.mockResolvedValue(undefined);
});

// Where a click landed, read off the router rather than a mocked navigate.
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderNavbar = (role = "lecturer") => {
  const store = configureStore({ reducer: { auth: authReducer, inbox: inboxReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { id: 3, display_name: "רב", role } } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter initialEntries={["/archive"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Navbar />
          <Routes><Route path="*" element={<Where />} /></Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

it("shows the unread count on the bell", async () => {
  renderNavbar();
  expect(await screen.findByRole("button", { name: "התראות, 1 שלא נקראו" })).toBeTruthy();
});

it("lists the notifications in words, and a click reads it and goes there", async () => {
  const user = userEvent.setup();
  renderNavbar();
  await user.click(await screen.findByRole("button", { name: /התראות, 1/ }));

  const menu = await screen.findByRole("menu");
  expect(within(menu).getByText("העיבוד הסתיים")).toBeTruthy();
  expect(within(menu).getByText("בקשה להרשאת מרצה מאת דוד")).toBeTruthy();

  await user.click(within(menu).getByText("העיבוד הסתיים"));
  expect(notificationsApi.markRead).toHaveBeenCalledWith(1);
  expect(screen.getByTestId("where").textContent).toBe("/media/9");
  // Optimistic: the count drops without waiting for the next poll.
  expect(screen.getByRole("button", { name: "התראות" })).toBeTruthy();
});

it("does not mark an already-read notification again", async () => {
  const user = userEvent.setup();
  renderNavbar();
  await user.click(await screen.findByRole("button", { name: /התראות, 1/ }));
  await user.click(within(await screen.findByRole("menu")).getByText("בקשת הרשאה חדשה"));
  expect(notificationsApi.markRead).not.toHaveBeenCalled();
  expect(screen.getByTestId("where").textContent).toBe("/users");
});

it("marks everything read in one press", async () => {
  const user = userEvent.setup();
  renderNavbar();
  await user.click(await screen.findByRole("button", { name: /התראות, 1/ }));
  await user.click(await screen.findByRole("button", { name: "סימון הכל כנקרא" }));
  expect(notificationsApi.markAllRead).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole("button", { name: "סימון הכל כנקרא" })).toBeNull());
});

it("says so when there is nothing yet", async () => {
  notificationsApi.list.mockResolvedValue({ items: [], unread: 0 });
  const user = userEvent.setup();
  renderNavbar();
  await waitFor(() => expect(notificationsApi.list).toHaveBeenCalled());
  await user.click(screen.getByRole("button", { name: "התראות" }));
  expect(await screen.findByText(/אין התראות עדיין/)).toBeTruthy();
});

it("puts the waiting role requests on the admin's users link", async () => {
  notificationsApi.list.mockResolvedValue({ items: [], unread: 0, pendingRoleRequests: 2 });
  renderNavbar("admin");
  expect(await screen.findAllByLabelText("משתמשים, 2 בקשות ממתינות")).not.toHaveLength(0);
});

it("shows no counter on the users link when nobody is waiting", async () => {
  notificationsApi.list.mockResolvedValue({ items: [], unread: 0, pendingRoleRequests: 0 });
  renderNavbar("admin");
  await waitFor(() => expect(notificationsApi.list).toHaveBeenCalled());
  expect(screen.queryByLabelText(/בקשות ממתינות/)).toBeNull();
});
