// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";

// The profile picture (migration 052): chosen, shrunk, sent and shown; removed;
// and offered once right after signing up.

const api = vi.hoisted(() => ({ uploadAvatar: vi.fn(), removeAvatar: vi.fn() }));
vi.mock("../../../api/authApi", async (importOriginal) => {
  const actual = await importOriginal();
  return { authApi: { ...actual.authApi, ...api } };
});

// Drawing needs a real canvas, which jsdom has not got; the drawing itself is
// utilities/avatarImage.js, tested there for what can be tested without one.
const prepare = vi.hoisted(() => vi.fn());
vi.mock("../../../utilities/avatarImage", async (importOriginal) => ({
  ...(await importOriginal()),
  prepareAvatar: (file) => prepare(file),
}));

import AvatarEditor from "./AvatarEditor";
import WelcomeAvatarDialog from "./WelcomeAvatarDialog";

const USER = { id: 4, email: "dana@example.com", display_name: "דנה", role: "student", avatar_url: null };

const setUp = (ui, over = {}) => {
  const store = configureStore({ reducer: { auth: authReducer, notification: notificationReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { ...USER, ...over } } });
  render(<Provider store={store}>{ui}</Provider>);
  return store;
};

const choosePicture = async () => {
  const input = document.querySelector('input[type="file"]');
  await userEvent.upload(input, new File(["x"], "face.heic", { type: "image/heic" }));
};

beforeEach(() => {
  api.uploadAvatar.mockReset();
  api.removeAvatar.mockReset();
  prepare.mockReset();
});

describe("the picture control", () => {
  test("a chosen picture is shrunk, sent, and shown — then it can be changed or removed", async () => {
    const shrunk = new Blob(["jpeg"], { type: "image/jpeg" });
    prepare.mockResolvedValue(shrunk);
    api.uploadAvatar.mockResolvedValue({ ...USER, avatar_url: "/api/auth/avatar/4?v=1" });
    const store = setUp(<AvatarEditor />);

    // The camera on the picture and the button beside it: both say what they do.
    expect(screen.getAllByRole("button", { name: "העלאת תמונה" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "הסרת התמונה" })).toBe(null);

    await choosePicture();
    await waitFor(() => expect(api.uploadAvatar).toHaveBeenCalledWith(shrunk));
    await waitFor(() => expect(store.getState().auth.user.avatar_url).toBe("/api/auth/avatar/4?v=1"));
    expect(screen.getAllByRole("button", { name: "החלפת תמונה" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "הסרת התמונה" })).toBeTruthy();
    // The role-request fields the banner reads are not dropped by the answer.
    expect(store.getState().auth.user.display_name).toBe("דנה");
  });

  test("a file this browser cannot draw is said at once, and nothing is sent", async () => {
    prepare.mockRejectedValue(new Error("not a picture"));
    const store = setUp(<AvatarEditor />);
    await choosePicture();
    await waitFor(() => expect(store.getState().notification.message).toMatch(/לא ניתן לקרוא את הקובץ כתמונה/));
    expect(api.uploadAvatar).not.toHaveBeenCalled();
  });

  test("removing clears the picture", async () => {
    api.removeAvatar.mockResolvedValue({ ...USER, avatar_url: null });
    const store = setUp(<AvatarEditor />, { avatar_url: "/api/auth/avatar/4?v=1" });
    await userEvent.click(screen.getByRole("button", { name: "הסרת התמונה" }));
    await waitFor(() => expect(store.getState().auth.user.avatar_url).toBe(null));
  });
});

describe("the picture offered after signing up", () => {
  test("appears once after an account is created here, and 'later' withdraws it", async () => {
    const store = setUp(<WelcomeAvatarDialog />);
    expect(screen.queryByRole("dialog")).toBe(null);

    act(() => {
      store.dispatch({ type: "auth/register/fulfilled", payload: { user: USER } });
    });
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("ברוכים הבאים, דנה!")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "אחר כך" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(store.getState().auth.offerAvatar).toBe(false);
  });

  test("a sign-in is not offered it", () => {
    setUp(<WelcomeAvatarDialog />);
    expect(screen.queryByRole("dialog")).toBe(null);
  });
});
