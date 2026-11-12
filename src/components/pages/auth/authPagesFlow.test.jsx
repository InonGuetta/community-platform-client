// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";

// The sign-in, sign-up, forgot-password, email-verification and Google-return
// pages: what each sends, where each goes after, and what each says when it
// cannot. ResetPassword has its own file. Only the API is replaced.

const authApi = vi.hoisted(() => ({
  login: vi.fn(), register: vi.fn(), forgotPassword: vi.fn(), verifyEmail: vi.fn(), me: vi.fn(),
}));
vi.mock("../../../api/authApi", () => ({ authApi }));

import SignIn from "./SignIn";
import SignUp from "./SignUp";
import ForgotPassword from "./ForgotPassword";
import VerifyEmail from "./VerifyEmail";
import GoogleCallback from "./GoogleCallback";

const renderAt = (path, element, preloadedAuth) => {
  const store = configureStore({ reducer: { auth: authReducer }, ...(preloadedAuth && { preloadedState: { auth: preloadedAuth } }) });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path.split("?")[0]} element={element} />
          <Route path="/archive" element={<div>הארכיון</div>} />
          <Route path="/sign-in" element={<div>דף ההתחברות</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
};
const field = (name) => document.querySelector(`input[name="${name}"]`);
const USER = { id: 3, email: "a@b.co", role: "student" };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("signing in", () => {
  test("sends what was typed and goes to the archive", async () => {
    authApi.login.mockResolvedValue({ user: USER });
    renderAt("/sign-in-page", <SignIn />);
    fireEvent.change(field("email"), { target: { name: "email", value: "a@b.co" } });
    fireEvent.change(field("password"), { target: { name: "password", value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "התחברות" }));
    expect(await screen.findByText("הארכיון")).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith({ email: "a@b.co", password: "secret123" });
  });

  test("a refusal is said, and the page stays", async () => {
    authApi.login.mockRejectedValue({ response: { status: 401, data: { message: "Invalid", code: "INVALID_CREDENTIALS" } } });
    renderAt("/sign-in-page", <SignIn />);
    fireEvent.change(field("email"), { target: { name: "email", value: "a@b.co" } });
    fireEvent.change(field("password"), { target: { name: "password", value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "התחברות" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("הארכיון")).not.toBeInTheDocument();
  });

  test("an error left from an earlier attempt is cleared on arrival", () => {
    renderAt("/sign-in-page", <SignIn />, { user: null, status: "idle", loginStatus: "failed", error: { message: "old" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("signing up", () => {
  test("an email with no domain ending is stopped before anything is sent", async () => {
    renderAt("/sign-up-page", <SignUp />);
    fireEvent.change(field("displayName"), { target: { name: "displayName", value: "דוד" } });
    fireEvent.change(field("email"), { target: { name: "email", value: "a@b" } });
    fireEvent.change(field("password"), { target: { name: "password", value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "הרשמה" }));
    await waitFor(() => expect(authApi.register).not.toHaveBeenCalled());
  });

  test("sends the application as a student by default and goes to the archive", async () => {
    authApi.register.mockResolvedValue({ user: USER });
    renderAt("/sign-up-page", <SignUp />);
    fireEvent.change(field("displayName"), { target: { name: "displayName", value: "דוד" } });
    fireEvent.change(field("email"), { target: { name: "email", value: "a@b.co" } });
    fireEvent.change(field("password"), { target: { name: "password", value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "הרשמה" }));
    expect(await screen.findByText("הארכיון")).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledWith({ email: "a@b.co", password: "secret123", displayName: "דוד", requestedRole: "student" });
  });
});

describe("forgetting a password", () => {
  test("sends the trimmed address and says to check the mail", async () => {
    authApi.forgotPassword.mockResolvedValue({});
    renderAt("/forgot", <ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/אימייל/), { target: { value: "  a@b.co " } });
    fireEvent.click(screen.getByRole("button", { name: "שלח קישור" }));
    expect(await screen.findByText("בדוק את תיבת הדואר")).toBeInTheDocument();
    expect(authApi.forgotPassword).toHaveBeenCalledWith("a@b.co");
  });

  test("a request that never arrived is said, and the form stays", async () => {
    authApi.forgotPassword.mockRejectedValue(new Error("Network Error"));
    renderAt("/forgot", <ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/אימייל/), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: "שלח קישור" }));
    expect(await screen.findByText("לא ניתן לשלוח כרגע. נסה שוב בעוד רגע.")).toBeInTheDocument();
  });
});

describe("verifying an email", () => {
  test("no token is a broken link, and nothing is sent", async () => {
    renderAt("/verify", <VerifyEmail />);
    expect(await screen.findByText("הקישור חסר או פגום.")).toBeInTheDocument();
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
  });

  test("the token is spent once, and success is said", async () => {
    authApi.verifyEmail.mockResolvedValue({});
    renderAt("/verify?token=abc", <VerifyEmail />);
    expect(await screen.findByText("כתובת האימייל שלך אומתה בהצלחה.")).toBeInTheDocument();
    expect(authApi.verifyEmail).toHaveBeenCalledTimes(1);
    expect(authApi.verifyEmail).toHaveBeenCalledWith("abc");
  });

  test("a refused token says it failed", async () => {
    authApi.verifyEmail.mockRejectedValue({ response: { status: 400, data: { message: "bad" } } });
    renderAt("/verify?token=abc", <VerifyEmail />);
    expect(await screen.findByText("האימות נכשל")).toBeInTheDocument();
  });
});

describe("coming back from Google", () => {
  test("Google's refusal goes back to sign-in, asking nothing", async () => {
    renderAt("/google?error=access_denied", <GoogleCallback />);
    expect(await screen.findByText("דף ההתחברות")).toBeInTheDocument();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  test("a session that the server confirms goes on to the archive", async () => {
    authApi.me.mockResolvedValue({ user: USER });
    renderAt("/google", <GoogleCallback />);
    expect(await screen.findByText("הארכיון")).toBeInTheDocument();
  });

  test("a session the server does not confirm goes back to sign-in", async () => {
    authApi.me.mockRejectedValue({ response: { status: 401 } });
    renderAt("/google", <GoogleCallback />);
    expect(await screen.findByText("דף ההתחברות")).toBeInTheDocument();
  });
});
