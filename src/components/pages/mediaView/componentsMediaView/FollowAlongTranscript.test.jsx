// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FollowAlongTranscript from "./FollowAlongTranscript";

// The transcript that follows the lesson (PRD MOB-6).

const captions = (precise = true) => ({
  precise,
  cues: [
    { text: "שלום לכולם.", start: 0, end: 3 },
    { text: "היום נלמד דף.", start: 3, end: 7 },
    { text: "נתחיל מהמשנה.", start: 7, end: 12 },
  ],
});

const highlighted = () => document.querySelector('[aria-current="true"]')?.textContent.trim();

describe("following the lesson", () => {
  it("highlights the sentence being said, and moves on with the player", () => {
    const { rerender } = render(<FollowAlongTranscript captions={captions()} currentTime={4} onSeek={() => {}} />);
    expect(highlighted()).toBe("היום נלמד דף.");
    rerender(<FollowAlongTranscript captions={captions()} currentTime={9} onSeek={() => {}} />);
    expect(highlighted()).toBe("נתחיל מהמשנה.");
  });

  it("plays from a sentence when it is pressed — or chosen from the keyboard", async () => {
    const onSeek = vi.fn();
    render(<FollowAlongTranscript captions={captions()} currentTime={0} onSeek={onSeek} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("נתחיל מהמשנה."));
    expect(onSeek).toHaveBeenLastCalledWith(7);

    screen.getByText("היום נלמד דף.").focus();
    await user.keyboard("{Enter}");
    expect(onSeek).toHaveBeenLastCalledWith(3);
  });

  it("says when the timing is an estimate", () => {
    render(<FollowAlongTranscript captions={captions(false)} currentTime={0} onSeek={() => {}} />);
    expect(screen.getByText(/התזמון בשיעור הזה משוער/)).toBeInTheDocument();
  });

  it("does not claim an estimate when the timing was stored", () => {
    render(<FollowAlongTranscript captions={captions(true)} currentTime={0} onSeek={() => {}} />);
    expect(screen.queryByText(/משוער/)).toBeNull();
  });
});
