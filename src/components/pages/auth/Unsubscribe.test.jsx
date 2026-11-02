// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { notificationsApi } from "../../../api/notificationsApi";
import Unsubscribe, { categoryInToken } from "./Unsubscribe";

// The page behind the link at the foot of every notification mail. It must not
// act on arrival — only on a press — and it names what it is about to stop.

vi.mock("../../../api/notificationsApi", () => ({
  notificationsApi: { unsubscribe: vi.fn() },
}));

// A token's shape, unsigned: the page only DISPLAYS from it.
const tokenFor = (cat) => `h.${btoa(JSON.stringify({ sub: "7", cat })).replace(/=+$/, "")}.s`;

beforeEach(() => {
  vi.clearAllMocks();
  notificationsApi.unsubscribe.mockResolvedValue({ category: "sessions" });
});

const renderAt = (token) =>
  render(
    <MemoryRouter
      initialEntries={[token === null ? "/unsubscribe" : `/unsubscribe?token=${encodeURIComponent(token)}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Unsubscribe />
    </MemoryRouter>
  );

it("asks first, naming the kind of mail, and sends nothing on arrival", () => {
  renderAt(tokenFor("sessions"));
  expect(screen.getByText("להפסיק לשלוח לך מיילים על מפגשים חיים?")).toBeTruthy();
  expect(notificationsApi.unsubscribe).not.toHaveBeenCalled();
});

it("stops that kind on the first button", async () => {
  const user = userEvent.setup();
  const token = tokenFor("sessions");
  renderAt(token);
  await user.click(screen.getByRole("button", { name: "הפסקת מיילים מסוג זה" }));
  expect(notificationsApi.unsubscribe).toHaveBeenCalledWith(token, { all: false });
  expect(await screen.findByText("לא יישלחו אליך יותר מיילים על מפגשים חיים.")).toBeTruthy();
});

it("stops everything on the second", async () => {
  notificationsApi.unsubscribe.mockResolvedValue({ category: "all" });
  const user = userEvent.setup();
  const token = tokenFor("sessions");
  renderAt(token);
  await user.click(screen.getByRole("button", { name: "הפסקת כל המיילים מהפלטפורמה" }));
  expect(notificationsApi.unsubscribe).toHaveBeenCalledWith(token, { all: true });
  expect(await screen.findByText("לא יישלחו אליך יותר מיילים מהפלטפורמה.")).toBeTruthy();
});

it("says the link is broken when the server refuses it", async () => {
  notificationsApi.unsubscribe.mockRejectedValue(new Error("400"));
  const user = userEvent.setup();
  renderAt(tokenFor("sessions"));
  await user.click(screen.getByRole("button", { name: "הפסקת מיילים מסוג זה" }));
  expect(await screen.findByText("הקישור אינו תקין")).toBeTruthy();
});

it("says so straight away when there is no token", () => {
  renderAt(null);
  expect(screen.getByText("הקישור אינו תקין")).toBeTruthy();
});

it("reads the category for display, and gives up quietly on garbage", () => {
  expect(categoryInToken(tokenFor("new_lessons"))).toBe("new_lessons");
  expect(categoryInToken("garbage")).toBe(null);
  expect(categoryInToken("")).toBe(null);
});
