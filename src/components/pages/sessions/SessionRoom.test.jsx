// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import sessionsReducer from "../../../store/slicesAndThunks/sessionsSlice/sessionsSlice";

// Entering a room, which stopped being "read the token out of the URL" and
// became "ask the server whether you may come in".
//
// Mocked at the API boundary rather than at the thunk, so the real thunk, the
// real reducer and the real component all run — the wiring between them is a
// large part of what this page is.
const sessionsApi = vi.hoisted(() => ({ join: vi.fn() }));
vi.mock("../../../api/sessionsApi", () => ({ sessionsApi }));

// VideoRoom opens a socket and asks for a camera. Its own behaviour belongs to
// its own tests; here it only has to prove it was handed the right token.
vi.mock("../../features/VideoRoom/VideoRoom", () => ({
  default: ({ roomToken, isHost }) => (
    <div data-testid="video-room" data-token={roomToken} data-host={String(isHost)} />
  ),
}));

import SessionRoom from "./SessionRoom";

const ROOM_TOKEN = "11111111-2222-3333-4444-555555555555";

const storeFor = (user) => {
  const store = configureStore({ reducer: { auth: authReducer, sessions: sessionsReducer } });
  if (user) store.dispatch({ type: "auth/login/fulfilled", payload: { user } });
  return store;
};

const renderRoom = ({ user = { id: 5, role: "student" } } = {}) => {
  const store = storeFor(user);
  render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={["/sessions/7"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/sessions/:id" element={<SessionRoom />} />
          <Route path="/sessions" element={<div data-testid="sessions-list" />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
};

// The shape POST /sessions/:id/join answers with. Note what is NOT on the
// session: the token travels once, under its own key.
const joined = (over = {}) => ({
  roomToken: ROOM_TOKEN,
  session: { id: 7, title: "מפגש", host_id: 2, state: "live", ...over },
});

beforeEach(() => {
  sessionsApi.join.mockReset();
});

describe("asking to come in", () => {
  test("shows a spinner while the answer is outstanding", () => {
    sessionsApi.join.mockReturnValue(new Promise(() => {}));
    renderRoom();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  test("joins by the id in the URL, not by a token", async () => {
    sessionsApi.join.mockResolvedValue(joined());
    renderRoom();
    await waitFor(() => expect(sessionsApi.join).toHaveBeenCalledWith("7"));
  });

  test("hands the room the token the server answered with", async () => {
    sessionsApi.join.mockResolvedValue(joined());
    renderRoom();

    const room = await screen.findByTestId("video-room");
    expect(room.getAttribute("data-token")).toBe(ROOM_TOKEN);
  });
});

// The reason the flow changed at all. A credential with the lifetime of one room
// must not sit in a store that is inspectable, serialised into devtools and kept
// for the life of the tab.
test("the room token never reaches the store", async () => {
  sessionsApi.join.mockResolvedValue(joined());
  const store = renderRoom();

  await screen.findByTestId("video-room");
  expect(JSON.stringify(store.getState())).not.toContain(ROOM_TOKEN);
});

describe("when the server says no", () => {
  const refuse = (code, message = "nope") =>
    sessionsApi.join.mockRejectedValue({ response: { data: { code, message } } });

  test("a session that has not started explains itself", async () => {
    refuse("SESSION_NOT_STARTED");
    renderRoom();

    // Keyed on the code, never on the server's English prose — see apiError.js.
    expect(await screen.findByText(/עדיין לא נפתח/)).toBeTruthy();
  });

  test("no room is rendered on a refusal", async () => {
    refuse("SESSION_NOT_FOUND");
    renderRoom();

    await screen.findByText(/המפגש לא נמצא/);
    expect(screen.queryByTestId("video-room")).toBe(null);
  });

  test("an unrecognised failure still says something", async () => {
    sessionsApi.join.mockRejectedValue({ response: { data: {} } });
    renderRoom();
    expect(await screen.findByText(/לא ניתן להצטרף/)).toBeTruthy();
  });
});

// Who gets "סיום מפגש" and who gets "עזיבה". It used to be decided from a room
// found in a list that a deep link or a refresh had never loaded, so a host
// arriving by URL was shown the guest's controls.
describe("host controls", () => {
  test("the host of this session is recognised", async () => {
    sessionsApi.join.mockResolvedValue(joined({ host_id: 5 }));
    renderRoom({ user: { id: 5, role: "lecturer" } });

    const room = await screen.findByTestId("video-room");
    expect(room.getAttribute("data-host")).toBe("true");
  });

  test("somebody else's room is not hosted by this user", async () => {
    sessionsApi.join.mockResolvedValue(joined({ host_id: 2 }));
    renderRoom({ user: { id: 5, role: "lecturer" } });

    const room = await screen.findByTestId("video-room");
    expect(room.getAttribute("data-host")).toBe("false");
  });

  // The id arrives from JSON and from a route param, so one side is routinely a
  // string — the trap canManageMedia documents on the server.
  test("a string id still matches the host", async () => {
    sessionsApi.join.mockResolvedValue(joined({ host_id: "5" }));
    renderRoom({ user: { id: 5, role: "lecturer" } });

    const room = await screen.findByTestId("video-room");
    expect(room.getAttribute("data-host")).toBe("true");
  });
});
