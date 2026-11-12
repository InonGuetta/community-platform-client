// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { publicApi } from "../../../api/publicApi";
import GuestLessonPage from "./GuestLessonPage";
import ShareDialog from "../mediaView/componentsMediaView/ShareDialog";

// A lesson its lecturer made public (PRD COM-3b, COM-4): what a guest with the
// link sees, and how the lesson's share dialog hands out that link.

vi.mock("../../../api/publicApi", async (importOriginal) => {
  const real = await importOriginal();
  return { publicApi: { ...real.publicApi, getLesson: vi.fn() } };
});

const LESSON = {
  id: 7, title: "פרשת כי תבא", media_type: "audio", duration_seconds: 600, creator_name: "הרב כהן",
  course_title: "פרשת השבוע", ai_summary: "על הבאת ביכורים בשמחה.", ai_key_points: ["שמחה במצוות"],
};

const renderGuest = (user = null) => {
  const store = configureStore({ reducer: { auth: () => ({ user }), notification: notificationReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/l/7"]}>
        <Routes><Route path="/l/:id" element={<GuestLessonPage />} /></Routes>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => vi.clearAllMocks());

describe("the guest page", () => {
  it("shows the lesson, its summary and a player on the public stream — and a way in", async () => {
    publicApi.getLesson.mockResolvedValue(LESSON);
    renderGuest();
    expect(await screen.findByRole("heading", { name: "פרשת כי תבא" })).toBeInTheDocument();
    expect(screen.getByText("על הבאת ביכורים בשמחה.")).toBeInTheDocument();
    expect(screen.getByText("שמחה במצוות")).toBeInTheDocument();
    expect(document.querySelector("audio").getAttribute("src")).toBe("/api/public/media/7/stream");
    expect(screen.getByRole("link", { name: "הצטרפות לקהילה" })).toHaveAttribute("href", "/sign-up");
    // None of what an account is for.
    expect(screen.queryByText(/דיון עם AI$/)).toBeNull();
    expect(publicApi.getLesson).toHaveBeenCalledWith("7");
  });

  it("points a signed-in reader to the full lesson page", async () => {
    publicApi.getLesson.mockResolvedValue(LESSON);
    renderGuest({ id: 3, role: "student" });
    expect(await screen.findByRole("link", { name: "לעמוד השיעור המלא" })).toHaveAttribute("href", "/media/7");
  });

  it("says plainly when the lesson is not open, without naming it", async () => {
    publicApi.getLesson.mockRejectedValue(Object.assign(new Error("404"), { response: { status: 404 } }));
    renderGuest();
    expect(await screen.findByText("השיעור הזה לא פתוח לציבור")).toBeInTheDocument();
  });
});

describe("sharing a lesson", () => {
  const renderShare = (publicLink) => {
    const store = configureStore({ reducer: { notification: notificationReducer } });
    render(
      <Provider store={store}>
        <ShareDialog open onClose={() => {}} title="פרשת כי תבא" path="/media/7" currentTime={30} canShareTime publicLink={publicLink} />
      </Provider>
    );
  };
  const whatsAppHref = async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    await userEvent.setup().click(screen.getByRole("button", { name: "WhatsApp" }));
    const href = decodeURIComponent(open.mock.calls[0][0]);
    open.mockRestore();
    return href;
  };

  it("sends the public link — the one WhatsApp previews — once the lesson is public", async () => {
    renderShare({ isPublic: true, isPublished: true, canManage: false, url: "http://app.test/api/public/share/7" });
    expect(await whatsAppHref()).toContain("http://app.test/api/public/share/7");
    // A guest starts at the start: no "from this moment".
    expect(screen.queryByText(/שתף מהזמן הנוכחי/)).toBeNull();
  });

  it("sends the lesson's own page while it is not public", async () => {
    renderShare({ isPublic: false, isPublished: true, canManage: false, url: "http://app.test/api/public/share/7" });
    expect(await whatsAppHref()).toContain("/media/7");
  });

  it("gives the lesson's manager the switch, and says when a draft cannot open yet", async () => {
    const toggle = vi.fn();
    renderShare({ isPublic: true, isPublished: false, canManage: true, busy: false, toggle, url: "x" });
    const toggleSwitch = screen.getByRole("checkbox", { name: /קישור ציבורי/ });
    expect(toggleSwitch).toBeChecked();
    expect(screen.getByText(/הקישור הציבורי לא ייפתח עד שיפורסם/)).toBeInTheDocument();
    await userEvent.setup().click(toggleSwitch);
    expect(toggle).toHaveBeenCalled();
  });

  it("offers no switch to a reader who does not manage the lesson", () => {
    renderShare({ isPublic: false, isPublished: true, canManage: false, url: "x" });
    expect(screen.queryByRole("checkbox", { name: /קישור ציבורי/ })).toBeNull();
  });
});

describe("the public link", () => {
  it("is the API's share page, which previews and then redirects", () => {
    expect(publicApi.shareUrl(7, "https://app.test")).toBe("https://app.test/api/public/share/7");
    expect(publicApi.streamUrl(7)).toBe("/api/public/media/7/stream");
  });
});
