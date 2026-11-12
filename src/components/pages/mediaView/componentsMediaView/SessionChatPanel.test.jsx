// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mediaApi } from "../../../../api/mediaApi";
import SessionChatPanel from "./SessionChatPanel";

// "צ'אט המפגש" (PRD REC-3): a recorded session's chat on its lesson.

vi.mock("../../../../api/mediaApi", () => ({ mediaApi: { sessionChat: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("the session's chat on its lesson", () => {
  it("lists who wrote what, and a message's time plays that moment", async () => {
    mediaApi.sessionChat.mockResolvedValue([
      { name: "הרב לוי", text: "המקור בדף ל\"ב", at: "2026-11-07T18:05:00Z", offset: 125 },
      { name: null, text: "<b>תודה</b>", at: "2026-11-07T18:06:00Z", offset: 190 },
    ]);
    const onSeek = vi.fn();
    render(<SessionChatPanel mediaId={55} onSeek={onSeek} />);
    expect(await screen.findByText("המקור בדף ל\"ב")).toBeInTheDocument();
    expect(mediaApi.sessionChat).toHaveBeenCalledWith(55);
    // Plain text, never markup; a missing name is still somebody.
    expect(screen.getByText("<b>תודה</b>")).toBeInTheDocument();
    expect(screen.getByText("משתתף")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "נגן מ־2:05" }));
    expect(onSeek).toHaveBeenCalledWith(125);
  });

  it("says so when nothing was written while recording", async () => {
    mediaApi.sessionChat.mockResolvedValue([]);
    render(<SessionChatPanel mediaId={55} onSeek={() => {}} />);
    expect(await screen.findByText("לא נכתבו הודעות בצ'אט בזמן ההקלטה.")).toBeInTheDocument();
  });

  it("says so when it could not be read", async () => {
    mediaApi.sessionChat.mockRejectedValue(new Error("offline"));
    render(<SessionChatPanel mediaId={55} onSeek={() => {}} />);
    expect(await screen.findByText("טעינת הצ'אט מהמפגש נכשלה.")).toBeInTheDocument();
  });
});
