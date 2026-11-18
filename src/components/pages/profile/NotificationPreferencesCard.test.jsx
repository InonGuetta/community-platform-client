// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { notificationsApi } from "../../../api/notificationsApi";
import NotificationPreferencesCard from "./NotificationPreferencesCard";

// The notification switches (PRD NOTIF-6, AUTH-13): per category the server
// offers, a mail switch and — where an SMS goes — an SMS switch, usable only
// with a verified number; optimistic, and put back with a message on failure.

vi.mock("../../../api/notificationsApi", () => ({
  notificationsApi: { preferences: vi.fn(), setPreference: vi.fn() },
}));

const PHONE = "+972545551234";
beforeEach(() => {
  vi.clearAllMocks();
  notificationsApi.preferences.mockResolvedValue({
    categories: [
      { key: "sessions", email: true, sms: false },
      { key: "new_lessons", email: false, sms: null },
    ],
    allOff: false,
    phoneVerified: false,
  });
  notificationsApi.setPreference.mockResolvedValue(undefined);
});

const renderCard = ({ phone = null } = {}) => {
  const store = configureStore({ reducer: { auth: authReducer, notification: notificationReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { id: 1, role: "student", phone } } });
  render(<Provider store={store}><NotificationPreferencesCard /></Provider>);
  return store;
};
const mail = (label) => screen.findByRole("switch", { name: `${label} — במייל` });
const sms = (label) => screen.findByRole("switch", { name: `${label} — ב־SMS` });

it("shows a mail switch per category the server offers, as it is set", async () => {
  renderCard();
  expect((await mail("מפגשים חיים")).checked).toBe(true);
  expect((await mail("שיעורים חדשים")).checked).toBe(false);
  // A student is not offered the lecturer's or the admin's mail.
  expect(screen.queryByRole("switch", { name: /בקשות הרשאה/ })).toBeNull();
});

it("saves a mail switch as it is pressed", async () => {
  const user = userEvent.setup();
  renderCard();
  await user.click(await mail("מפגשים חיים"));
  expect(notificationsApi.setPreference).toHaveBeenCalledWith("sessions", "email", false);
  expect((await mail("מפגשים חיים")).checked).toBe(false);
});

it("puts a switch back, and says so, when the save fails", async () => {
  notificationsApi.setPreference.mockRejectedValue(new Error("offline"));
  const user = userEvent.setup();
  const store = renderCard();
  await user.click(await mail("מפגשים חיים"));
  await waitFor(async () => expect((await mail("מפגשים חיים")).checked).toBe(true));
  expect(JSON.stringify(store.getState().notification)).toContain("שמירת ההעדפה נכשלה");
});

it("SMS only where a category goes by SMS, and only with a verified number", async () => {
  renderCard();
  const sessions = await sms("מפגשים חיים");
  expect(sessions.disabled).toBe(true);
  expect(screen.queryByRole("switch", { name: "שיעורים חדשים — ב־SMS" })).toBeNull();
  expect(screen.getByText(/צריך להוסיף מספר טלפון ולאמת אותו/)).toBeTruthy();
});

it("with a verified number, an SMS switch is saved as it is pressed", async () => {
  const user = userEvent.setup();
  renderCard({ phone: PHONE });
  const sessions = await sms("מפגשים חיים");
  expect(sessions.disabled).toBe(false);
  await user.click(sessions);
  expect(notificationsApi.setPreference).toHaveBeenCalledWith("sessions", "sms", true);
  expect(screen.getByText(/בין 22:00 ל־07:00/)).toBeTruthy();
});

it("turning off all SMS sends one request for every SMS category", async () => {
  notificationsApi.preferences.mockResolvedValue({
    categories: [{ key: "sessions", email: true, sms: true }, { key: "enrolments", email: true, sms: true }],
    allOff: false,
    phoneVerified: true,
  });
  const user = userEvent.setup();
  renderCard({ phone: PHONE });
  await user.click(await screen.findByRole("button", { name: "כיבוי כל ה־SMS" }));
  expect(notificationsApi.setPreference).toHaveBeenCalledWith("all", "sms", false);
  expect((await sms("מפגשים חיים")).checked).toBe(false);
});

it("removing the number turns the SMS switches off here too", async () => {
  notificationsApi.preferences.mockResolvedValue({
    categories: [{ key: "sessions", email: true, sms: true }],
    allOff: false,
    phoneVerified: true,
  });
  const store = renderCard({ phone: PHONE });
  expect((await sms("מפגשים חיים")).checked).toBe(true);
  act(() => {
    store.dispatch({ type: "phone/remove/fulfilled", payload: { phone: null, phone_verified_at: null, phone_pending: null } });
  });
  await waitFor(async () => expect((await sms("מפגשים חיים")).checked).toBe(false));
  expect((await sms("מפגשים חיים")).disabled).toBe(true);
});
