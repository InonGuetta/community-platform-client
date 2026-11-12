// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import discussionReducer from "../../../store/slicesAndThunks/discussionSlice/discussionSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { discussionApi } from "../../../api/discussionApi";
import { placeOf, placeHref } from "../../../utilities/discussionPlace";
import AskArchivePage from "./AskArchivePage";
import { ARCHIVE_SUGGESTIONS } from "./useAskArchivePageController";

// "שאל את הארכיון" (PRD ASK-2): the lesson chat's slice and pane, keyed by
// "archive", with citations that open their own lesson.

vi.mock("../../../api/discussionApi", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    discussionApi: { getConversation: vi.fn(), startConversation: vi.fn(), askStream: vi.fn() },
  };
});

const Where = () => <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;

const renderPage = () => {
  const store = configureStore({ reducer: { discussion: discussionReducer, notification: notificationReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter initialEntries={["/ask"]}>
          <Routes>
            <Route path="/ask" element={<AskArchivePage />} />
            <Route path="/media/:id" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

const CITATION = {
  n: 1, chunk_index: 2, start_time: 1200, end_time: 1800, page_number: null, char_start: null,
  quote: "על תשובה", media_id: 4, media_title: "שיחת הכנה", creator_name: "הרב כהן", media_type: "audio",
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  discussionApi.getConversation.mockResolvedValue({ conversation: null, messages: [], quota: { limit: 50, remaining: 48 } });
});

describe("asking the archive", () => {
  it("loads the archive's own conversation and offers questions about many lessons", async () => {
    renderPage();
    expect(await screen.findByText(ARCHIVE_SUGGESTIONS[0])).toBeInTheDocument();
    expect(discussionApi.getConversation).toHaveBeenCalledWith("archive");
    expect(screen.getByPlaceholderText("שאל שאלה על הארכיון…")).toBeInTheDocument();
    expect(screen.getByText(/נשארו לך היום 48 שאלות/)).toBeInTheDocument();
  });

  it("asks through the archive's stream, and a cited source names its lesson and opens it at the moment", async () => {
    discussionApi.askStream.mockResolvedValue({
      conversation: { id: 70, media_id: null },
      messages: [
        { id: 1, role: "user", content: "מה נאמר על תשובה?", citations: [] },
        { id: 2, role: "assistant", content: "הרב כהן אמר כך [1].", citations: [CITATION] },
      ],
    });
    renderPage();
    const user = userEvent.setup();
    await user.type(await screen.findByRole("textbox", { name: "שאלה" }), "מה נאמר על תשובה?");
    await user.click(screen.getByRole("button", { name: "שלח" }));
    expect(discussionApi.askStream.mock.calls[0][0]).toBe("archive");
    expect(discussionApi.askStream.mock.calls[0][1]).toBe("מה נאמר על תשובה?");

    await user.click(await screen.findByText("[1] «שיחת הכנה», 20:00"));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/media/4?t=1200"));
  });
});

describe("a citation's place", () => {
  it("is labelled with its lesson, and linked to the moment or page", () => {
    const place = placeOf(CITATION);
    expect(place).toMatchObject({ kind: "time", mediaId: 4, label: "«שיחת הכנה», 20:00" });
    expect(placeHref(place)).toBe("/media/4?t=1200");
    expect(placeHref(placeOf({ ...CITATION, start_time: null, page_number: 7 }))).toBe("/media/4?page=7");
    expect(placeHref(placeOf({ ...CITATION, start_time: 0 }))).toBe("/media/4");
  });

  it("a lesson's own citation is unchanged — no lesson in its label", () => {
    const { media_id: _id, media_title: _t, ...own } = CITATION;
    expect(placeOf(own)).toEqual({ kind: "time", seconds: 1200, label: "20:00" });
  });
});
