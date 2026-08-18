// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";

// The user's own account — the only write they make to their own row, and until
// this screen existed an admin could rename anybody while nobody could rename
// themselves.
//
// Mocked at the thunk for the same reason ResetPassword.test.jsx is: a mocked
// axios rejection is reported by vitest as unhandled even when the thunk catches
// it. The action-type properties are carried across because authSlice builds its
// reducer from them.
const profileCall = vi.hoisted(() => vi.fn());
const passwordCall = vi.hoisted(() => vi.fn());

vi.mock("../../../store/slicesAndThunks/authSlices/authPut", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    updateProfile: Object.assign((args) => profileCall(args), {
      pending: actual.updateProfile.pending,
      fulfilled: actual.updateProfile.fulfilled,
      rejected: actual.updateProfile.rejected,
    }),
  };
});
vi.mock("../../../store/slicesAndThunks/authSlices/authPost", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    changePassword: Object.assign((args) => passwordCall(args), {
      pending: actual.changePassword.pending,
      fulfilled: actual.changePassword.fulfilled,
      rejected: actual.changePassword.rejected,
    }),
  };
});

import ProfilePage from "./ProfilePage";

const answers = (mock, action) => mock.mockReturnValue(() => Promise.resolve(action));
const fulfilled = (payload) => ({ meta: { requestStatus: "fulfilled" }, payload });
const rejected = (code) => ({ meta: { requestStatus: "rejected" }, payload: { code } });

const USER = {
  id: 4,
  email: "student@example.com",
  display_name: "אברהם",
  role: "student",
  email_verified: true,
};

const renderProfile = (over = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, notification: notificationReducer },
  });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { ...USER, ...over } } });
  render(
    <Provider store={store}>
      <ProfilePage />
    </Provider>
  );
  return store;
};

beforeEach(() => {
  profileCall.mockReset();
  passwordCall.mockReset();
});

describe("what the account shows", () => {
  test("the email is shown but not editable", () => {
    renderProfile();
    expect(screen.getByText("student@example.com")).toBeTruthy();
    // Changing an address is a re-verification flow, not a profile edit. A text
    // field here would promise something this screen cannot do.
    expect(screen.queryByLabelText(/אימייל/)).toBe(null);
  });

  test("an unverified address says so", () => {
    renderProfile({ email_verified: false });
    expect(screen.getByText("כתובת לא אומתה")).toBeTruthy();
  });

  test("a verified one says so too", () => {
    renderProfile({ email_verified: true });
    expect(screen.getByText("כתובת מאומתת")).toBeTruthy();
  });
});

describe("renaming yourself", () => {
  test("nothing to save until the name actually changes", () => {
    renderProfile();
    expect(screen.getByRole("button", { name: "שמירה" }).disabled).toBe(true);
  });

  // The allowlist, from the user's side. The server refuses anything else, and
  // this is the half that proves the client never asks.
  test("saving sends the display name and nothing else", async () => {
    const user = userEvent.setup();
    answers(profileCall, fulfilled({ ...USER, display_name: "יצחק" }));
    renderProfile();

    const field = screen.getByLabelText("שם תצוגה");
    await user.clear(field);
    await user.type(field, "יצחק");
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => expect(profileCall).toHaveBeenCalledWith({ displayName: "יצחק" }));
    // Not role, not is_active, not email — the fields an admin can change and a
    // user must not.
    const sent = profileCall.mock.calls[0][0];
    expect(Object.keys(sent)).toEqual(["displayName"]);
  });

  test("a blank name cannot be saved", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.clear(screen.getByLabelText("שם תצוגה"));

    expect(screen.getByRole("button", { name: "שמירה" }).disabled).toBe(true);
    expect(profileCall).not.toHaveBeenCalled();
  });
});

describe("changing your password", () => {
  const passwordFields = () => ({
    current: screen.getByLabelText("הסיסמה הנוכחית"),
    next: screen.getByLabelText("סיסמה חדשה"),
    confirm: screen.getByLabelText("אימות סיסמה חדשה"),
    submit: screen.getByRole("button", { name: "שינוי סיסמה" }),
  });

  test("all three fields are required", () => {
    renderProfile();
    expect(passwordFields().submit.disabled).toBe(true);
  });

  test("a mismatch is refused before it is sent", async () => {
    const user = userEvent.setup();
    renderProfile();
    const f = passwordFields();

    await user.type(f.current, "old-password");
    await user.type(f.next, "a-long-enough-password");
    await user.type(f.confirm, "a-long-enough-passwrod");

    expect(screen.getByText("הסיסמאות אינן תואמות")).toBeTruthy();
    expect(f.submit.disabled).toBe(true);
    expect(passwordCall).not.toHaveBeenCalled();
  });

  test("the current password is sent alongside the new one", async () => {
    const user = userEvent.setup();
    answers(passwordCall, fulfilled({ message: "ok" }));
    renderProfile();
    const f = passwordFields();

    await user.type(f.current, "old-password");
    await user.type(f.next, "a-long-enough-password");
    await user.type(f.confirm, "a-long-enough-password");
    await user.click(f.submit);

    // Required by the server, and not as a formality: a session left open on a
    // shared machine is the ordinary way an account is taken over.
    await waitFor(() =>
      expect(passwordCall).toHaveBeenCalledWith({
        currentPassword: "old-password",
        newPassword: "a-long-enough-password",
      })
    );
  });

  test("a wrong current password is reported next to the field, not as a toast", async () => {
    const user = userEvent.setup();
    answers(passwordCall, rejected("INVALID_CREDENTIALS"));
    renderProfile();
    const f = passwordFields();

    await user.type(f.current, "wrong");
    await user.type(f.next, "a-long-enough-password");
    await user.type(f.confirm, "a-long-enough-password");
    await user.click(f.submit);

    expect(await screen.findByText(/אימייל או סיסמה שגויים/)).toBeTruthy();
  });

  // A Google-only account has no password to change, and saying so beats a
  // generic failure the user cannot act on.
  test("an account with no password is told to use Google", async () => {
    const user = userEvent.setup();
    answers(passwordCall, rejected("NO_PASSWORD_SET"));
    renderProfile();
    const f = passwordFields();

    await user.type(f.current, "anything");
    await user.type(f.next, "a-long-enough-password");
    await user.type(f.confirm, "a-long-enough-password");
    await user.click(f.submit);

    expect(await screen.findByText(/מתחבר עם Google/)).toBeTruthy();
  });

  test("the fields are cleared once it succeeds", async () => {
    const user = userEvent.setup();
    answers(passwordCall, fulfilled({ message: "ok" }));
    renderProfile();
    const f = passwordFields();

    await user.type(f.current, "old-password");
    await user.type(f.next, "a-long-enough-password");
    await user.type(f.confirm, "a-long-enough-password");
    await user.click(f.submit);

    // Leaving a password sitting in a form on a screen somebody walks away from
    // is the state this whole card exists to protect against.
    await waitFor(() => expect(f.current.value).toBe(""));
    expect(f.next.value).toBe("");
    expect(f.confirm.value).toBe("");
  });
});
