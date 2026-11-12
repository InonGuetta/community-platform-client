// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { notificationsApi } from "../../../api/notificationsApi";
import EmailPreferencesCard from "./EmailPreferencesCard";

// The mail switches (PRD NOTIF-6): one per category the server says this user
// can get, optimistic, and put back — with a message — when the save fails.

vi.mock("../../../api/notificationsApi", () => ({
  notificationsApi: { preferences: vi.fn(), setPreference: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  notificationsApi.preferences.mockResolvedValue({
    categories: [
      { key: "sessions", email: true },
      { key: "new_lessons", email: false },
    ],
    allOff: false,
  });
  notificationsApi.setPreference.mockResolvedValue(undefined);
});

const renderCard = () => {
  const store = configureStore({ reducer: { notification: notificationReducer } });
  render(<Provider store={store}><EmailPreferencesCard /></Provider>);
  return store;
};

it("shows one switch per category the server offers, as it is set", async () => {
  renderCard();
  const sessions = await screen.findByRole("switch", { name: "מפגשים חיים" });
  expect(sessions.checked).toBe(true);
  expect(screen.getByRole("switch", { name: "שיעורים חדשים" }).checked).toBe(false);
  // A student is not offered the lecturer's or the admin's mail.
  expect(screen.queryByRole("switch", { name: "בקשות הרשאה" })).toBeNull();
});

it("saves a switch as it is pressed", async () => {
  const user = userEvent.setup();
  renderCard();
  await user.click(await screen.findByRole("switch", { name: "מפגשים חיים" }));
  expect(notificationsApi.setPreference).toHaveBeenCalledWith("sessions", false);
  expect(screen.getByRole("switch", { name: "מפגשים חיים" }).checked).toBe(false);
});

it("puts a switch back, and says so, when the save fails", async () => {
  notificationsApi.setPreference.mockRejectedValue(new Error("offline"));
  const user = userEvent.setup();
  const store = renderCard();
  await user.click(await screen.findByRole("switch", { name: "מפגשים חיים" }));
  await waitFor(() => expect(screen.getByRole("switch", { name: "מפגשים חיים" }).checked).toBe(true));
  expect(JSON.stringify(store.getState().notification)).toContain("שמירת ההעדפה נכשלה");
});

it("after unsubscribing from everything, offers to take it back", async () => {
  notificationsApi.preferences.mockResolvedValue({ categories: [{ key: "sessions", email: true }], allOff: true });
  const user = userEvent.setup();
  renderCard();
  expect(await screen.findByText("ביקשת להפסיק את כל המיילים מהפלטפורמה.")).toBeTruthy();
  expect(screen.getByRole("switch", { name: "מפגשים חיים" }).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "החזרת המיילים" }));
  expect(notificationsApi.setPreference).toHaveBeenCalledWith("all", true);
  expect(screen.queryByText("ביקשת להפסיק את כל המיילים מהפלטפורמה.")).toBeNull();
});
