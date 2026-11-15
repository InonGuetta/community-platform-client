// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../store/slicesAndThunks/authSlice/authSlice";
import i18n from "../../i18n/i18n";

// The account's users.locale and the browser's language, kept in step by the
// shell: the account wins, except over a choice made before signing in into an
// account still on Hebrew, which is saved instead.

const authApi = vi.hoisted(() => ({ setLocale: vi.fn() }));
vi.mock("../../api/authApi", () => ({ authApi }));

import { useAccountLanguageSync, useChooseLanguage } from "./useAccountLanguage";

const storeWith = (user) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (user) store.dispatch({ type: "auth/login/fulfilled", payload: { user } });
  return store;
};

// A button per language stands in for the switcher, so a test picks a
// language the way a person does.
const Shell = () => {
  useAccountLanguageSync();
  const choose = useChooseLanguage();
  return ["es", "yi"].map((code) => (
    <button key={code} onClick={() => choose(code)}>
      {code}
    </button>
  ));
};

const choose = async (code) => {
  fireEvent.click(screen.getByRole("button", { name: code }));
  await waitFor(() => expect(i18n.language).toBe(code));
};

const mount = (user) => {
  const store = storeWith(user);
  render(
    <Provider store={store}>
      <Shell />
    </Provider>
  );
  return store;
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  authApi.setLocale.mockImplementation(async (locale) => ({ id: 1, locale }));
});

test("signing in to an English account switches the interface to English", async () => {
  mount({ id: 1, locale: "en" });
  await waitFor(() => expect(i18n.language).toBe("en"));
  expect(document.documentElement.dir).toBe("ltr");
  expect(authApi.setLocale).not.toHaveBeenCalled();
});

test("a language picked before signing in is saved to an account still on Hebrew", async () => {
  localStorage.setItem("language", "fr");
  await act(() => i18n.changeLanguage("fr"));
  const store = mount({ id: 1, locale: "he" });
  await waitFor(() => expect(authApi.setLocale).toHaveBeenCalledWith("fr"));
  await waitFor(() => expect(store.getState().auth.user.locale).toBe("fr"));
  expect(i18n.language).toBe("fr");
});

test("signed out, nothing is saved anywhere", async () => {
  mount(null);
  await choose("es");
  expect(authApi.setLocale).not.toHaveBeenCalled();
});

test("picking a language while signed in switches at once and saves it to the account", async () => {
  const store = mount({ id: 1, locale: "he" });
  await choose("yi");
  await waitFor(() => expect(store.getState().auth.user.locale).toBe("yi"));
  expect(authApi.setLocale).toHaveBeenCalledWith("yi");
});
