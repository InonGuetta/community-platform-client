// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { authApi } from "../../../api/authApi";
import { formatPhone, codeDigits } from "../../../utilities/phone";
import PhoneCard from "./PhoneCard";

// The phone card (PRD AUTH-13): a number typed, the code sent and typed back,
// refusals said where they happen, and a verified number changed or removed.

vi.mock("../../../api/authApi", () => ({
  authApi: { startPhoneVerification: vi.fn(), verifyPhone: vi.fn(), removePhone: vi.fn() },
}));

const USER = { id: 4, email: "dana@example.com", display_name: "דנה", role: "student", avatar_url: null };
const PHONE = "+972545551234";
const inTenMinutes = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();
const WAITING = { phone: null, phone_verified_at: null, phone_pending: PHONE, phone_pending_expires_at: inTenMinutes() };
const VERIFIED = { phone: PHONE, phone_verified_at: "2026-11-18T12:00:00Z", phone_pending: null, phone_pending_expires_at: null };
const NONE = { phone: null, phone_verified_at: null, phone_pending: null, phone_pending_expires_at: null };

const setUp = (over = {}) => {
  const store = configureStore({ reducer: { auth: authReducer, notification: notificationReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { ...USER, ...NONE, ...over } } });
  render(<Provider store={store}><PhoneCard /></Provider>);
  return store;
};
const rejection = (code, params) => Object.assign(new Error("refused"), { response: { status: 400, data: { message: "x", code, params } } });

beforeEach(() => {
  vi.clearAllMocks();
  authApi.startPhoneVerification.mockResolvedValue({ ...WAITING, phone_pending_expires_at: inTenMinutes() });
  authApi.verifyPhone.mockResolvedValue(VERIFIED);
  authApi.removePhone.mockResolvedValue(NONE);
});

it("formats an Israeli number as it is written, and keeps the code's digits only", () => {
  expect(formatPhone("+972545551234")).toBe("054-555-1234");
  expect(formatPhone("+12125550199")).toBe("+12125550199");
  expect(codeDigits("481 516")).toBe("481516");
  expect(codeDigits("קוד: 481-5167")).toBe("481516");
});

it("sends a code to the number typed, then verifies the six digits as soon as they are in", async () => {
  const user = userEvent.setup();
  const store = setUp();
  await user.type(screen.getByLabelText("מספר נייד"), "054-555-1234");
  await user.click(screen.getByRole("button", { name: "שליחת קוד" }));
  expect(authApi.startPhoneVerification).toHaveBeenCalledWith("054-555-1234");

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("054-555-1234")).toBeTruthy();
  await user.type(within(dialog).getByLabelText("קוד אימות"), "481516");
  await waitFor(() => expect(authApi.verifyPhone).toHaveBeenCalledWith("481516"));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(store.getState().auth.user.phone).toBe(PHONE);
  expect(screen.getByText("מאומת")).toBeTruthy();
});

it("says why a number was refused, under the number", async () => {
  authApi.startPhoneVerification.mockRejectedValue(rejection("PHONE_NOT_MOBILE"));
  const user = userEvent.setup();
  setUp();
  await user.type(screen.getByLabelText("מספר נייד"), "02-6234567");
  await user.click(screen.getByRole("button", { name: "שליחת קוד" }));
  expect(await screen.findByText(/צריך מספר נייד/)).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("a wrong code says how many attempts are left, and the field is cleared for another try", async () => {
  authApi.verifyPhone.mockRejectedValue(rejection("PHONE_CODE_INVALID", { attemptsLeft: 4 }));
  const user = userEvent.setup();
  setUp(WAITING);
  await user.click(screen.getByRole("button", { name: "הזנת הקוד" }));
  const dialog = await screen.findByRole("dialog");
  const field = within(dialog).getByLabelText("קוד אימות");
  await user.type(field, "000000");
  expect(await within(dialog).findByText(/נותרו 4/)).toBeTruthy();
  expect(field.value).toBe("");
});

it("a new code waits a minute after the last one", async () => {
  const user = userEvent.setup();
  setUp();
  await user.type(screen.getByLabelText("מספר נייד"), "0545551234");
  await user.click(screen.getByRole("button", { name: "שליחת קוד" }));
  const dialog = await screen.findByRole("dialog");
  const resend = within(dialog).getByRole("button", { name: /קוד חדש בעוד \d+ שנ׳/ });
  expect(resend.disabled).toBe(true);
});

it("a number waiting for its code is offered again after the page is reloaded", () => {
  setUp(WAITING);
  expect(screen.getByText("054-555-1234")).toBeTruthy();
  expect(screen.getByRole("button", { name: "הזנת הקוד" })).toBeTruthy();
});

it("an expired wait is not offered", () => {
  setUp({ ...WAITING, phone_pending_expires_at: new Date(Date.now() - 1000).toISOString() });
  expect(screen.queryByRole("button", { name: "הזנת הקוד" })).toBeNull();
});

it("a verified number is shown with change and remove, and removing asks first", async () => {
  const user = userEvent.setup();
  const store = setUp(VERIFIED);
  expect(screen.getByText("054-555-1234")).toBeTruthy();
  expect(screen.queryByLabelText("מספר נייד")).toBeNull();

  await user.click(screen.getByRole("button", { name: "החלפת מספר" }));
  expect(screen.getByLabelText("מספר נייד חדש")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "ביטול" }));

  await user.click(screen.getByRole("button", { name: "הסרת המספר" }));
  const confirm = await screen.findByRole("dialog");
  expect(authApi.removePhone).not.toHaveBeenCalled();
  await user.click(within(confirm).getByRole("button", { name: "הסרת המספר" }));
  await waitFor(() => expect(authApi.removePhone).toHaveBeenCalled());
  await waitFor(() => expect(store.getState().auth.user.phone).toBeNull());
});

it("a profile save keeps the phone the PATCH does not return", () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { ...USER, ...VERIFIED } } });
  store.dispatch({ type: "auth/updateProfile/fulfilled", payload: { ...USER, display_name: "דנה כהן" } });
  expect(store.getState().auth.user.display_name).toBe("דנה כהן");
  expect(store.getState().auth.user.phone).toBe(PHONE);
});

it("a whole SMS pasted into the field is read for its six digits", async () => {
  const user = userEvent.setup();
  setUp(WAITING);
  await user.click(screen.getByRole("button", { name: "הזנת הקוד" }));
  const field = within(await screen.findByRole("dialog")).getByLabelText("קוד אימות");
  await user.click(field);
  await user.paste("קוד האימות שלך: 481516. אין למסור אותו לאף אחד.");
  await waitFor(() => expect(authApi.verifyPhone).toHaveBeenCalledWith("481516"));
  expect(authApi.verifyPhone).toHaveBeenCalledTimes(1);
});

it("a code the server ended (too many attempts) is no longer offered", async () => {
  authApi.verifyPhone.mockRejectedValue(Object.assign(new Error("x"), { response: { status: 429, data: { message: "x", code: "PHONE_CODE_LIMIT" } } }));
  const user = userEvent.setup();
  const store = setUp(WAITING);
  await user.click(screen.getByRole("button", { name: "הזנת הקוד" }));
  await user.type(within(await screen.findByRole("dialog")).getByLabelText("קוד אימות"), "000000");
  await waitFor(() => expect(store.getState().auth.user.phone_pending).toBeNull());
});

it("the minute before another code counts from when the waiting one was sent, even after a reload", async () => {
  const user = userEvent.setup();
  // Sent 30 seconds ago: its expiry is ten minutes after that.
  setUp({ ...WAITING, phone_pending_expires_at: new Date(Date.now() - 30_000 + 10 * 60 * 1000).toISOString() });
  await user.click(screen.getByRole("button", { name: "הזנת הקוד" }));
  const resend = within(await screen.findByRole("dialog")).getByRole("button", { name: /קוד חדש בעוד (2\d|30|31) שנ׳/ });
  expect(resend.disabled).toBe(true);
});
