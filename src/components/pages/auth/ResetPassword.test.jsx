// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import { resetPassword as realResetPassword } from "../../../store/slicesAndThunks/authSlices/authPost";

// Choosing a new password, reached from a link in an inbox.
//
// This is the one password a user cannot check by signing in with it afterwards:
// a typo here locks them out again and the only way back is another email. The
// screen's job is to make that impossible, and none of it was tested.
//
// Mocked at the THUNK rather than at the API — the same boundary
// MediaViewPage.test.jsx mocks, and here for a concrete reason: a rejected
// promise from a mocked axios is reported by vitest as an unhandled error even
// though createAsyncThunk catches it and turns it into a rejected action. The
// component was verified to behave correctly under that setup (one call, the
// right Hebrew in the alert) and the runner failed the test anyway. Handing back
// the action SHAPE the component actually reads keeps every assertion below
// honest and involves no rejection at all.
const dispatched = vi.hoisted(() => vi.fn());
vi.mock("../../../store/slicesAndThunks/authSlices/authPost", async (importOriginal) => {
  const actual = await importOriginal();
  // The action-type properties are carried over deliberately: authSlice builds
  // its reducer from `resetPassword.pending` and the two beside it, so a bare
  // function here makes configureStore throw before a single test runs.
  const stub = Object.assign((args) => dispatched(args), {
    pending: actual.resetPassword.pending,
    fulfilled: actual.resetPassword.fulfilled,
    rejected: actual.resetPassword.rejected,
  });
  return { ...actual, resetPassword: stub };
});

import ResetPassword from "./ResetPassword";

// What `await dispatch(thunk)` resolves to. redux-thunk invokes the function and
// returns whatever it returns, so a promise of the action shape is enough.
const answers = (action) => dispatched.mockReturnValue(() => Promise.resolve(action));
const fulfilled = (user) => ({ meta: { requestStatus: "fulfilled" }, payload: { user } });
const rejected = (code) => ({ meta: { requestStatus: "rejected" }, payload: { code } });

const renderAt = (search) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[`/reset-password${search}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/archive" element={<div data-testid="archive" />} />
          <Route path="/forgot-password" element={<div data-testid="forgot" />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
};

// `required` makes MUI append an asterisk inside the label element, so an exact
// string never matches.
const fields = () => ({
  password: screen.getByLabelText(/סיסמה חדשה/),
  confirm: screen.getByLabelText(/אימות סיסמה/),
  submit: screen.getByRole("button", { name: "שמור והתחבר" }),
});

const typeInto = async (user, password, confirm = password) => {
  const f = fields();
  await user.type(f.password, password);
  await user.type(f.confirm, confirm);
  return f;
};

// Separate from typing, because the tests below that expect a refusal must NOT
// click: a disabled button carries `pointer-events: none`, and user-event
// refuses to click it rather than pretending a real user could.
const submitWith = async (user, password, confirm = password) => {
  const f = await typeInto(user, password, confirm);
  await user.click(f.submit);
  return f;
};

beforeEach(() => dispatched.mockReset());

// A link with no token is a broken link, and saying so beats collecting a
// password and failing on submit.
describe("a link with no token", () => {
  test("says the link is broken instead of showing a form", () => {
    renderAt("");
    expect(screen.getByText(/הקישור חסר או פגום/)).toBeTruthy();
    expect(screen.queryByLabelText(/סיסמה חדשה/)).toBe(null);
  });

  test("offers the way to get a working one", () => {
    renderAt("");
    expect(screen.getByRole("link", { name: /בקשת קישור חדש/ })).toBeTruthy();
  });
});

describe("what the form refuses to submit", () => {
  test("nothing typed", () => {
    renderAt("?token=abc");
    expect(fields().submit.disabled).toBe(true);
  });

  // The typo case, and the reason the second field exists at all.
  test("two passwords that do not match", async () => {
    const user = userEvent.setup();
    renderAt("?token=abc");
    const { submit } = await typeInto(user, "a-long-enough-password", "a-long-enough-passwrod");

    expect(screen.getByText("הסיסמאות אינן תואמות")).toBeTruthy();
    expect(submit.disabled).toBe(true);
    expect(dispatched).not.toHaveBeenCalled();
  });

  // Mirrors MIN_PASSWORD_LENGTH in servicesAuth.js. Checked here as well so the
  // user is told before a round trip, not after.
  test("a password under eight characters", async () => {
    const user = userEvent.setup();
    renderAt("?token=abc");
    const { submit } = await typeInto(user, "short");

    expect(screen.getByText(/לפחות 8 תווים/)).toBeTruthy();
    expect(submit.disabled).toBe(true);
    expect(dispatched).not.toHaveBeenCalled();
  });
});

describe("a successful reset", () => {
  test("sends the token from the URL with the chosen password", async () => {
    const user = userEvent.setup();
    answers(fulfilled({ id: 4 }));
    renderAt("?token=the-token-from-the-email");
    await submitWith(user, "a-long-enough-password");

    await waitFor(() =>
      expect(dispatched).toHaveBeenCalledWith({
        token: "the-token-from-the-email",
        password: "a-long-enough-password",
      })
    );
  });

  // The server mints a cookie with the reset, so the user is already signed in.
  // Sending them to /sign-in to type the password they chose four seconds ago is
  // a step that exists only when a flow is built in two halves.
  test("lands the user in the application rather than back at a login form", async () => {
    const user = userEvent.setup();
    answers(fulfilled({ id: 4 }));
    renderAt("?token=abc");
    await submitWith(user, "a-long-enough-password");

    expect(await screen.findByTestId("archive")).toBeTruthy();
  });
});

describe("when the server refuses", () => {
  test("an expired link is explained, and the form stays", async () => {
    const user = userEvent.setup();
    answers(rejected("INVALID_RESET_TOKEN"));
    renderAt("?token=stale");
    await submitWith(user, "a-long-enough-password");

    // Hebrew chosen by the CODE, never by the server's English prose — the whole
    // reason ERROR_CODES exists.
    expect(await screen.findByText(/הקישור אינו תקף/)).toBeTruthy();
    expect(screen.queryByTestId("archive")).toBe(null);
  });

  test("a weak password rejected server-side is reported too", async () => {
    const user = userEvent.setup();
    answers(rejected("WEAK_PASSWORD"));
    renderAt("?token=abc");
    await submitWith(user, "a-long-enough-password");

    expect(await screen.findByText(/לפחות 8 תווים/)).toBeTruthy();
  });

  test("an unrecognised failure still says something", async () => {
    const user = userEvent.setup();
    answers(rejected(undefined));
    renderAt("?token=abc");
    await submitWith(user, "a-long-enough-password");

    expect(await screen.findByText(/איפוס הסיסמה נכשל/)).toBeTruthy();
  });
});

// The half the thunk mock above deliberately steps over: that a completed reset
// lands in auth state the way a login does, so the user arrives signed IN rather
// than merely navigated. Asserted against the real reducer and the real action
// type, with no component and no network.
test("a fulfilled reset signs the user in, like a login", () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch({
    type: realResetPassword.fulfilled.type,
    payload: { user: { id: 4, role: "student" } },
  });

  expect(store.getState().auth.user).toEqual({ id: 4, role: "student" });
  expect(store.getState().auth.initialized).toBe(true);
});
