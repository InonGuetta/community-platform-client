// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import offlineReducer from "../../../store/slicesAndThunks/offlineSlice/offlineSlice";
import { buildTheme } from "../../../theme/theme";

// What the signed-in account's state shows and does outside its own page: the
// banner for a pending or refused role request, the card that asks for one on
// the profile, and signing out from the bar — which takes the lessons kept for
// offline listening with it, then signs out, then goes to sign-in.

const authApi = vi.hoisted(() => ({ logout: vi.fn(), requestRole: vi.fn() }));
const clearOffline = vi.hoisted(() => vi.fn());
vi.mock("../../../api/authApi", () => ({ authApi }));
vi.mock("../../../api/notificationsApi", () => ({
  notificationsApi: { list: vi.fn().mockResolvedValue({ items: [], unread: 0 }), markRead: vi.fn(), markAllRead: vi.fn() },
}));
vi.mock("../../../utilities/offlineStore", async (importOriginal) => ({
  ...(await importOriginal()),
  clearOffline: (...a) => clearOffline(...a),
}));

import PendingRoleBanner from "./PendingRoleBanner";
import Navbar from "./Navbar";
import RoleRequestCard from "../../pages/profile/RoleRequestCard";

const withUser = (user, ui) => {
  const store = configureStore({ reducer: { auth: authReducer, offline: offlineReducer } });
  if (user) store.dispatch({ type: "auth/login/fulfilled", payload: { user } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter initialEntries={["/archive"]}>
          <Routes>
            <Route path="/archive" element={ui} />
            <Route path="/sign-in" element={<div>דף ההתחברות</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

beforeEach(() => vi.clearAllMocks());

describe("the pending-role banner", () => {
  test("a request still waiting says so", () => {
    withUser({ id: 1, role: "student", requested_role: "lecturer", approval_status: "pending" }, <PendingRoleBanner />);
    expect(screen.getByText(/ממתינה לאישור מנהל/)).toBeInTheDocument();
  });

  test("a refused request says so", () => {
    withUser({ id: 1, role: "student", requested_role: "lecturer", approval_status: "rejected" }, <PendingRoleBanner />);
    expect(screen.getByText(/לא אושרה/)).toBeInTheDocument();
  });

  test("an account that asked for nothing sees nothing", () => {
    withUser({ id: 1, role: "student", requested_role: "student", approval_status: "approved" }, <PendingRoleBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("the role-request card", () => {
  test("an admin has nothing to ask for", () => {
    withUser({ id: 1, role: "admin" }, <RoleRequestCard />);
    expect(screen.queryByText("שליחת בקשה")).not.toBeInTheDocument();
  });

  test("a request already waiting is shown instead of the form", () => {
    withUser({ id: 1, role: "student", requested_role: "lecturer", approval_status: "pending" }, <RoleRequestCard />);
    expect(screen.getByText(/ממתינה/)).toBeInTheDocument();
    expect(screen.queryByText("שליחת בקשה")).not.toBeInTheDocument();
  });

  test("sends the chosen role, a lecturer by default", async () => {
    authApi.requestRole.mockResolvedValue({ user: { id: 1, role: "student", requested_role: "lecturer", approval_status: "pending" } });
    withUser({ id: 1, role: "student", approval_status: "approved" }, <RoleRequestCard />);
    fireEvent.click(screen.getByRole("button", { name: "שליחת בקשה" }));
    await waitFor(() => expect(authApi.requestRole).toHaveBeenCalledWith("lecturer"));
  });
});

test("signing out clears the offline lessons, then signs out, then goes to sign-in", async () => {
  const order = [];
  clearOffline.mockImplementation(async () => { order.push("offline"); return []; });
  authApi.logout.mockImplementation(async () => { order.push("logout"); });
  withUser({ id: 1, role: "student", display_name: "דוד" }, <Navbar />);
  fireEvent.click(screen.getAllByRole("button", { name: "התנתקות" })[0]);
  expect(await screen.findByText("דף ההתחברות")).toBeInTheDocument();
  expect(order).toEqual(["offline", "logout"]);
});
