// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationReducer from "../../../../store/slicesAndThunks/snackbarSlice";
import { mediaApi } from "../../../../api/mediaApi";
import AiTagSuggestions from "./AiTagSuggestions";
import { purposeLabel } from "../../admin/componentsAdmin/aiUsageFormat";

// Tags the LLM proposed (PRD ARCH-4): shown with where they sit in the tree and
// why, and nothing becomes a tag until a person accepts it. The API is the only
// thing replaced.

vi.mock("../../../../api/mediaApi", () => ({
  mediaApi: {
    aiTagSuggestions: vi.fn(),
    requestAiTagSuggestions: vi.fn(),
    approveAiTagSuggestions: vi.fn(),
    dismissAiTagSuggestions: vi.fn(),
  },
}));

const SHEMOT = { id: 3, name: "שמות", path: "תנ\"ך > תורה > שמות", reason: "השיעור עוסק ביציאת מצרים" };
const EMUNA = { id: 9, name: "אמונה", path: "אמונה", reason: null };

const renderBox = (onTagged = vi.fn()) => {
  const store = configureStore({ reducer: { notification: notificationReducer } });
  render(<Provider store={store}><AiTagSuggestions mediaId={7} onTagged={onTagged} /></Provider>);
  return { store, onTagged };
};

beforeEach(() => vi.clearAllMocks());

describe("proposed tags", () => {
  it("show where each sits in the tree and why it was proposed", async () => {
    mediaApi.aiTagSuggestions.mockResolvedValue([SHEMOT, EMUNA]);
    renderBox();
    expect(await screen.findByText("שמות")).toBeInTheDocument();
    expect(screen.getByText(/תנ"ך > תורה > שמות · השיעור עוסק ביציאת מצרים/)).toBeInTheDocument();
    expect(mediaApi.aiTagSuggestions).toHaveBeenCalledWith(7);
  });

  it("become a tag only when accepted, and the lesson is read again", async () => {
    mediaApi.aiTagSuggestions.mockResolvedValue([SHEMOT, EMUNA]);
    mediaApi.approveAiTagSuggestions.mockResolvedValue([EMUNA]);
    const { onTagged } = renderBox();
    await userEvent.setup().click(await screen.findByRole("button", { name: "הוספת התגית שמות" }));
    expect(mediaApi.approveAiTagSuggestions).toHaveBeenCalledWith(7, [3]);
    await waitFor(() => expect(screen.queryByText("שמות")).toBeNull());
    expect(onTagged).toHaveBeenCalled();
  });

  it("are dismissed one by one, or all together", async () => {
    mediaApi.aiTagSuggestions.mockResolvedValue([SHEMOT, EMUNA]);
    mediaApi.dismissAiTagSuggestions.mockResolvedValueOnce([EMUNA]).mockResolvedValueOnce([]);
    const { onTagged } = renderBox();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "דחיית התגית שמות" }));
    expect(mediaApi.dismissAiTagSuggestions).toHaveBeenLastCalledWith(7, [3]);
    mediaApi.aiTagSuggestions.mockResolvedValue([EMUNA]);
    await waitFor(() => expect(screen.queryByText("שמות")).toBeNull());
    expect(onTagged).not.toHaveBeenCalled();
  });

  it("can be asked for when none are waiting", async () => {
    mediaApi.aiTagSuggestions.mockResolvedValue([]);
    mediaApi.requestAiTagSuggestions.mockResolvedValue([SHEMOT]);
    renderBox();
    await userEvent.setup().click(await screen.findByRole("button", { name: "הצעת תגיות" }));
    expect(mediaApi.requestAiTagSuggestions).toHaveBeenCalledWith(7);
    expect(await screen.findByText("שמות")).toBeInTheDocument();
  });

  it("are named in the cost meter", () => {
    expect(purposeLabel("tagging")).toBe("הצעות תגיות");
  });
});
