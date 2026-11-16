// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../store/slicesAndThunks/authSlice/authSlice";
import notificationReducer from "../../store/slicesAndThunks/snackbarSlice";
import { notificationMiddleware } from "../../store/middleware/notificationMiddleware";
import i18n, { startLanguage } from "../../i18n/i18n";

// The account's users.locale and the browser's language, kept in step by the
// shell: the account wins, except over a choice made in this tab while signed
// out, right before signing in — which is saved instead.

const authApi = vi.hoisted(() => ({ setLocale: vi.fn() }));
vi.mock("../../api/authApi", () => ({ authApi }));

import { useAccountLanguageSync, useChooseLanguage } from "./useAccountLanguage";

const newStore = () =>
  configureStore({
    reducer: { auth: authReducer, notification: notificationReducer },
    middleware: (getDefault) => getDefault().concat(notificationMiddleware),
  });
const signIn = (store, user) => store.dispatch({ type: "auth/login/fulfilled", payload: { user } });

// A button per language stands in for the switcher, so a test picks a
// language the way a person does.
const Shell = () => {
  useAccountLanguageSync();
  const choose = useChooseLanguage();
  return ["en", "fr", "es", "yi"].map((code) => (
    <button key={code} onClick={() => choose(code)}>
      {code}
    </button>
  ));
};

const mount = (user, store = newStore()) => {
  if (user) signIn(store, user);
  render(
    <Provider store={store}>
      <Shell />
    </Provider>
  );
  return store;
};

const pick = (code) => fireEvent.click(screen.getByRole("button", { name: code }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  authApi.setLocale.mockImplementation(async (locale) => ({ id: 1, locale }));
});

test("signing in to an English account switches the interface to English", async () => {
  mount({ id: 1, locale: "en" });
  await waitFor(() => expect(i18n.language).toBe("en"));
  expect(document.documentElement.dir).toBe("ltr");
  expect(authApi.setLocale).not.toHaveBeenCalled();
});

test("a language picked while signed out is saved by the sign-in that follows", async () => {
  const store = mount(null);
  pick("fr");
  await waitFor(() => expect(i18n.language).toBe("fr"));
  expect(authApi.setLocale).not.toHaveBeenCalled();

  act(() => signIn(store, { id: 1, locale: "he" }));
  await waitFor(() => expect(authApi.setLocale).toHaveBeenCalledWith("fr"));
  await waitFor(() => expect(store.getState().auth.user.locale).toBe("fr"));
  expect(i18n.language).toBe("fr");
});

test("on a shared computer, one account's language does not leak into the next", async () => {
  // A reads French: the interface adopts it, and the browser remembers French.
  mount({ id: 1, locale: "fr" });
  await waitFor(() => expect(i18n.language).toBe("fr"));
  expect(localStorage.getItem("language")).toBe("fr");
  cleanup();

  // B reads Hebrew and chose nothing in this tab: B's account is left alone.
  mount({ id: 2, locale: "he" });
  await waitFor(() => expect(i18n.language).toBe("he"));
  expect(authApi.setLocale).not.toHaveBeenCalled();
});

test("a guest's choice is used once — a later sign-in does not save it again", async () => {
  const store = mount(null);
  pick("es");
  await waitFor(() => expect(i18n.language).toBe("es"));
  act(() => signIn(store, { id: 1, locale: "he" }));
  await waitFor(() => expect(authApi.setLocale).toHaveBeenCalledTimes(1));
  cleanup();

  mount({ id: 2, locale: "en" });
  await waitFor(() => expect(i18n.language).toBe("en"));
  expect(authApi.setLocale).toHaveBeenCalledTimes(1);
});

test("picking a language while signed in switches at once and saves it to the account", async () => {
  const store = mount({ id: 1, locale: "he" });
  pick("yi");
  await waitFor(() => expect(i18n.language).toBe("yi"));
  await waitFor(() => expect(authApi.setLocale).toHaveBeenCalledWith("yi"));
  expect(store.getState().auth.user.locale).toBe("yi");
});

test("two quick choices end on the second, even when the first answer arrives last", async () => {
  const answers = {};
  authApi.setLocale.mockImplementation((locale) => new Promise((resolve) => (answers[locale] = () => resolve({ id: 1, locale }))));
  const store = mount({ id: 1, locale: "he" });

  pick("en");
  await waitFor(() => expect(answers.en).toBeDefined());
  pick("fr");
  await waitFor(() => expect(answers.fr).toBeDefined());
  await act(async () => answers.fr());
  await act(async () => answers.en());

  expect(store.getState().auth.user.locale).toBe("fr");
  await waitFor(() => expect(i18n.language).toBe("fr"));
});

test("a failed save says so, and the interface keeps the language chosen", async () => {
  authApi.setLocale.mockRejectedValue(Object.assign(new Error("offline"), { code: "ERR_NETWORK" }));
  const store = mount({ id: 1, locale: "he" });
  pick("en");
  await waitFor(() => expect(store.getState().notification.message).toBeTruthy());
  expect(store.getState().notification.severity).toBe("error");
  expect(i18n.language).toBe("en");
});

test("the account is compared with the language start-up lands on, not with Hebrew mid-load", async () => {
  localStorage.setItem("language", "fr");
  // Start-up is switching to the stored French while the account (English)
  // arrives; the decision waits for start-up, then adopts the account.
  const starting = startLanguage();
  mount({ id: 1, locale: "en" });
  await starting;
  await waitFor(() => expect(i18n.language).toBe("en"));
  expect(localStorage.getItem("language")).toBe("en");
});
