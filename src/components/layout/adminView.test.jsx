// @vitest-environment jsdom
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { readAdminView, saveAdminView, AdminViewContext } from "./adminView";
import { useAdminView } from "./useAdminView";
import AdminOnly from "./AdminOnly";

// "תצוגת מנהל" (D-07): on by default, kept per browser, offered to a lecturer
// or an admin — and for anyone else it never shows anything, whatever is stored.

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("is on by default and remembers being turned off", () => {
  expect(readAdminView()).toBe(true);
  saveAdminView(false);
  expect(readAdminView()).toBe(false);
  saveAdminView(true);
  expect(readAdminView()).toBe(true);
});

test("storage that throws leaves it on, and saving does not throw", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readAdminView()).toBe(true);
  expect(() => saveAdminView(false)).not.toThrow();
});

const Probe = () => {
  const { eligible, showAdmin } = useAdminView();
  return <p>{`${eligible} ${showAdmin}`}</p>;
};

const renderAs = (role, enabled) => {
  const store = configureStore({ reducer: { auth: () => ({ user: role ? { id: 1, role } : null }) } });
  render(
    <Provider store={store}>
      <AdminViewContext.Provider value={{ enabled, toggle: () => {} }}>
        <Probe />
        <AdminOnly><span>admin-only</span></AdminOnly>
      </AdminViewContext.Provider>
    </Provider>
  );
};

test("a lecturer with it on sees admin-only elements", () => {
  renderAs("lecturer", true);
  expect(screen.getByText("true true")).toBeInTheDocument();
  expect(screen.getByText("admin-only")).toBeInTheDocument();
});

test("an admin with it off does not", () => {
  renderAs("admin", false);
  expect(screen.getByText("true false")).toBeInTheDocument();
  expect(screen.queryByText("admin-only")).toBeNull();
});

test("a student never does, even with it on", () => {
  renderAs("student", true);
  expect(screen.getByText("false false")).toBeInTheDocument();
  expect(screen.queryByText("admin-only")).toBeNull();
});
