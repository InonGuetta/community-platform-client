// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationReducer from "../../../../store/slicesAndThunks/notificationSlice";
import ShareDialog from "./ShareDialog";

// What each way of sharing sends, and what copying says when it works and when
// the browser will not let it.

const renderDialog = (props = {}) => {
  const store = configureStore({ reducer: { notification: notificationReducer } });
  const onClose = vi.fn();
  render(
    <Provider store={store}>
      <ShareDialog open onClose={onClose} title="שיעור בתפילה" path="/media/7" {...props} />
    </Provider>
  );
  return { store, onClose };
};
const notices = (store) => JSON.stringify(store.getState().notification);

beforeEach(() => {
  vi.restoreAllMocks();
  window.open = vi.fn();
});

describe("copying the link", () => {
  test("copies the lesson's link, says so, and closes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { store, onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /העתק/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toMatch(/\/media\/7$/);
    expect(notices(store)).toContain("הקישור הועתק");
  });

  test("where the browser refuses, shows the link itself and stays open", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    const { store, onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /העתק/ }));
    await waitFor(() => expect(notices(store)).toContain("לא ניתן להעתיק אוטומטית. הקישור:"));
    expect(notices(store)).toMatch(/\/media\/7/);
    expect(onClose).not.toHaveBeenCalled();
  });
});

test("WhatsApp gets the title and the link, in a new window with no opener", () => {
  const { onClose } = renderDialog();
  fireEvent.click(screen.getByRole("button", { name: /WhatsApp|וואטסאפ/ }));
  const [href, target, features] = window.open.mock.calls[0];
  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(href)).toContain("שיעור בתפילה");
  expect(decodeURIComponent(href)).toMatch(/\/media\/7/);
  expect([target, features]).toEqual(["_blank", "noopener,noreferrer"]);
  expect(onClose).toHaveBeenCalled();
});

test("a public, published lesson shares its public link", () => {
  renderDialog({ publicLink: { isPublic: true, isPublished: true, url: "https://example.test/l/7" } });
  fireEvent.click(screen.getByRole("button", { name: /WhatsApp|וואטסאפ/ }));
  expect(decodeURIComponent(window.open.mock.calls[0][0])).toContain("https://example.test/l/7");
});
