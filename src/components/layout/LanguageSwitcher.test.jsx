// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import List from "@mui/material/List";
import authReducer from "../../store/slicesAndThunks/authSlice/authSlice";
import i18n from "../../i18n/i18n";

const authApi = vi.hoisted(() => ({ setLocale: vi.fn() }));
vi.mock("../../api/authApi", () => ({ authApi }));

import LanguageSwitcher from "./LanguageSwitcher";

const mount = (ui, user = null) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (user) store.dispatch({ type: "auth/login/fulfilled", payload: { user } });
  render(<Provider store={store}>{ui}</Provider>);
  return store;
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  authApi.setLocale.mockImplementation(async (locale) => ({ id: 1, locale }));
});

const NAMES = ["עברית", "ייִדיש", "English", "Français", "Español"];

test("the globe lists every language, each in itself and in its own direction", () => {
  mount(<LanguageSwitcher />);
  fireEvent.click(screen.getByRole("button", { name: "שינוי שפה" }));
  const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
  expect(items.map((i) => i.textContent)).toEqual(NAMES);
  const english = items[2];
  expect(english).toHaveAttribute("lang", "en");
  expect(english).toHaveAttribute("dir", "ltr");
  expect(items[0]).toHaveClass("Mui-selected");
});

test("choosing from the globe switches the interface and closes the list", async () => {
  mount(<LanguageSwitcher />);
  fireEvent.click(screen.getByRole("button", { name: "שינוי שפה" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Français" }));
  await waitFor(() => expect(i18n.language).toBe("fr"));
  expect(document.documentElement.dir).toBe("ltr");
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  expect(localStorage.getItem("language")).toBe("fr");
});

test("the drawer's row names the current language and opens the same list", async () => {
  mount(
    <List>
      <LanguageSwitcher variant="list" />
    </List>
  );
  const row = screen.getByRole("button", { name: /שפת האתר/ });
  expect(row).toHaveTextContent("עברית");
  fireEvent.click(row);
  fireEvent.click(screen.getByRole("menuitem", { name: "ייִדיש" }));
  await waitFor(() => expect(i18n.language).toBe("yi"));
  expect(document.documentElement.dir).toBe("rtl");
});

test("the profile's field saves the choice to a signed-in account", async () => {
  const store = mount(<LanguageSwitcher variant="field" />, { id: 1, locale: "he" });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "שפת האתר" }));
  fireEvent.click(screen.getByRole("option", { name: "Español" }));
  await waitFor(() => expect(authApi.setLocale).toHaveBeenCalledWith("es"));
  expect(i18n.language).toBe("es");
  await waitFor(() => expect(store.getState().auth.user.locale).toBe("es"));
});
