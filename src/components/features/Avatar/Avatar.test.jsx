// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";

// The profile picture (migration 052): chosen from the device or taken now
// with the camera, framed in the crop editor, sent and shown; removed; and
// offered once right after signing up.

const api = vi.hoisted(() => ({ uploadAvatar: vi.fn(), removeAvatar: vi.fn() }));
vi.mock("../../../api/authApi", async (importOriginal) => {
  const actual = await importOriginal();
  return { authApi: { ...actual.authApi, ...api } };
});

// Decoding and drawing need a real canvas, which jsdom has not got; the
// framing arithmetic is utilities/avatarImage.js, tested there.
const pic = vi.hoisted(() => ({ decode: vi.fn(), render: vi.fn(), frame: vi.fn() }));
vi.mock("../../../utilities/avatarImage", async (importOriginal) => ({
  ...(await importOriginal()),
  decodePicture: (file) => pic.decode(file),
  renderAvatar: (bitmap, rect) => pic.render(bitmap, rect),
  captureFrame: (video) => pic.frame(video),
}));

import AvatarEditor from "./AvatarEditor";
import WelcomeAvatarDialog from "./WelcomeAvatarDialog";

const USER = { id: 4, email: "dana@example.com", display_name: "דנה", role: "student", avatar_url: null };
const DECODED = { bitmap: "bitmap", url: "blob:picture", width: 400, height: 300, release: vi.fn() };

const setUp = (ui, over = {}) => {
  const store = configureStore({ reducer: { auth: authReducer, notification: notificationReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { ...USER, ...over } } });
  render(<Provider store={store}>{ui}</Provider>);
  return store;
};

const chooseFile = async () => {
  const input = document.querySelector('input[type="file"]:not([capture])');
  await userEvent.upload(input, new File(["x"], "face.heic", { type: "image/heic" }));
};

const realMediaDevices = navigator.mediaDevices;
beforeEach(() => {
  api.uploadAvatar.mockReset();
  api.removeAvatar.mockReset();
  pic.decode.mockReset();
  pic.render.mockReset();
  pic.frame.mockReset();
  DECODED.release.mockReset();
});
afterEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { value: realMediaDevices, configurable: true });
});

describe("choosing and framing a picture", () => {
  test("a chosen picture opens the crop editor; saving sends the framed square", async () => {
    const square = new Blob(["jpeg"], { type: "image/jpeg" });
    pic.decode.mockResolvedValue(DECODED);
    pic.render.mockResolvedValue(square);
    api.uploadAvatar.mockResolvedValue({ ...USER, avatar_url: "/api/auth/avatar/4?v=1" });
    const store = setUp(<AvatarEditor />);

    await chooseFile();
    const dialog = await screen.findByRole("dialog", { name: "עריכת תמונת הפרופיל" });
    expect(dialog.querySelector("img").getAttribute("src")).toBe("blob:picture");
    expect(api.uploadAvatar).not.toHaveBeenCalled();

    // Zoomed in once, then saved: the rect drawn is the zoomed square.
    await userEvent.click(screen.getByRole("button", { name: "הגדלה" }));
    await userEvent.click(screen.getByRole("button", { name: "שמירת התמונה" }));
    await waitFor(() => expect(api.uploadAvatar).toHaveBeenCalledWith(square));
    const [, rect] = pic.render.mock.calls[0];
    expect(rect.size).toBeLessThan(300);
    expect(pic.render.mock.calls[0][0]).toBe("bitmap");

    await waitFor(() => expect(store.getState().auth.user.avatar_url).toBe("/api/auth/avatar/4?v=1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(DECODED.release).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "הסרת התמונה" })).toBeTruthy();
  });

  test("the picture is moved with the keyboard as well as by dragging", async () => {
    pic.decode.mockResolvedValue(DECODED);
    pic.render.mockResolvedValue(new Blob(["j"]));
    api.uploadAvatar.mockResolvedValue({ ...USER, avatar_url: "/x" });
    setUp(<AvatarEditor />);
    await chooseFile();
    const area = await screen.findByRole("group", { name: /אזור החיתוך/ });
    // Centred, a 400×300 picture shows its middle square; → reveals its left.
    fireEvent.keyDown(area, { key: "ArrowLeft" });
    await userEvent.click(screen.getByRole("button", { name: "שמירת התמונה" }));
    await waitFor(() => expect(pic.render).toHaveBeenCalled());
    expect(pic.render.mock.calls[0][1].sx).toBeLessThan(50);
  });

  test("cancelling the editor sends nothing and frees the picture", async () => {
    pic.decode.mockResolvedValue(DECODED);
    setUp(<AvatarEditor />);
    await chooseFile();
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "ביטול" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(api.uploadAvatar).not.toHaveBeenCalled();
    expect(DECODED.release).toHaveBeenCalled();
  });

  test("a file this browser cannot draw is said at once, and no editor opens", async () => {
    pic.decode.mockRejectedValue(new Error("not a picture"));
    const store = setUp(<AvatarEditor />);
    await chooseFile();
    await waitFor(() => expect(store.getState().notification.message).toMatch(/לא ניתן לקרוא את הקובץ כתמונה/));
    expect(screen.queryByRole("dialog")).toBe(null);
  });

  test("removing clears the picture", async () => {
    api.removeAvatar.mockResolvedValue({ ...USER, avatar_url: null });
    const store = setUp(<AvatarEditor />, { avatar_url: "/api/auth/avatar/4?v=1" });
    await userEvent.click(screen.getByRole("button", { name: "הסרת התמונה" }));
    await waitFor(() => expect(store.getState().auth.user.avatar_url).toBe(null));
  });
});

describe("taking a photo now", () => {
  const camera = (getUserMedia) =>
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

  test("the camera opens live, the frame goes to the crop editor, and the camera is turned off", async () => {
    const stop = vi.fn();
    camera(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
    const frame = new Blob(["frame"], { type: "image/jpeg" });
    pic.frame.mockResolvedValue(frame);
    pic.decode.mockResolvedValue(DECODED);
    setUp(<AvatarEditor />);

    await userEvent.click(screen.getAllByRole("button", { name: "צילום עכשיו" })[1]);
    const shoot = await screen.findByRole("button", { name: "צילום" });
    await waitFor(() => expect(shoot.disabled).toBe(false));
    await userEvent.click(shoot);

    await waitFor(() => expect(pic.decode).toHaveBeenCalledWith(frame));
    expect(await screen.findByRole("dialog", { name: "עריכת תמונת הפרופיל" })).toBeTruthy();
    expect(stop).toHaveBeenCalled();
  });

  test("a refused camera says so and offers the device's files", async () => {
    camera(vi.fn().mockRejectedValue(Object.assign(new Error("no"), { name: "NotAllowedError" })));
    setUp(<AvatarEditor />);
    await userEvent.click(screen.getAllByRole("button", { name: "צילום עכשיו" })[1]);
    expect(await screen.findByText(/הגישה למצלמה נחסמה/)).toBeTruthy();
    const dialog = screen.getByRole("dialog", { name: "צילום תמונת פרופיל" });
    expect(dialog.querySelector("video")).toBe(null);
    expect([...dialog.querySelectorAll("button")].some((b) => b.textContent === "העלאת תמונה")).toBe(true);
  });

  test("where the page cannot open a camera, the device's own camera input is used", async () => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    setUp(<AvatarEditor />);
    const captureInput = document.querySelector('input[capture="user"]');
    const click = vi.spyOn(captureInput, "click");
    await userEvent.click(screen.getAllByRole("button", { name: "צילום עכשיו" })[1]);
    expect(click).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBe(null);
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
