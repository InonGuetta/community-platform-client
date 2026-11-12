// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecordButton, RecordingIndicator, ConsentDialog, recordingLabel } from "./RecordingControls";

// What each person in a recorded room sees (PRD REC-1).

const STATE = { active: true, recordingId: 5, hostSocketId: "h", consented: ["h", "a"], declined: ["b"] };

describe("the consent question", () => {
  it("is asked of a participant who has not answered, and 'no' is an answer", async () => {
    const onAnswer = vi.fn();
    render(<ConsentDialog recording={STATE} mySocketId="c" onAnswer={onAnswer} />);
    expect(screen.getByRole("dialog", { name: "המארח מקליט את המפגש" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "לא, בלי הקול שלי" }));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("is a no when dismissed — silence is never consent", async () => {
    const onAnswer = vi.fn();
    render(<ConsentDialog recording={STATE} mySocketId="c" onAnswer={onAnswer} />);
    await userEvent.setup().keyboard("{Escape}");
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("is not asked of the host, of someone who answered, or when nothing is recorded", () => {
    for (const [state, me] of [[STATE, "h"], [STATE, "a"], [STATE, "b"], [{ ...STATE, active: false }, "c"]]) {
      const { unmount } = render(<ConsentDialog recording={state} mySocketId={me} onAnswer={() => {}} />);
      expect(screen.queryByRole("dialog")).toBe(null);
      unmount();
    }
  });
});

describe("the indicator", () => {
  it("says whose voice is in the recording", () => {
    expect(recordingLabel(STATE, "h")).toBe("מקליט — 2 משתתפים בהקלטה");
    expect(recordingLabel({ ...STATE, consented: ["h"] }, "h")).toBe("מקליט — רק הקול שלך בהקלטה");
    expect(recordingLabel(STATE, "a")).toBe("מוקלט — הקול שלך בהקלטה");
    expect(recordingLabel(STATE, "b")).toBe("מוקלט — הקול שלך לא בהקלטה");
    expect(recordingLabel(STATE, "c")).toBe("מוקלט — ממתין לתשובתך");
  });

  it("lets a participant change their answer either way", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<RecordingIndicator recording={STATE} mySocketId="a" onAnswer={onAnswer} />);
    await user.click(screen.getByRole("button", { name: "הפסיקו להקליט אותי" }));
    unmount();
    render(<RecordingIndicator recording={STATE} mySocketId="b" onAnswer={onAnswer} />);
    await user.click(screen.getByRole("button", { name: "אני מסכים/ה להקלטה" }));
    expect(onAnswer.mock.calls).toEqual([[false], [true]]);
  });

  it("is not there when nothing is recorded", () => {
    render(<RecordingIndicator recording={{ ...STATE, active: false }} mySocketId="a" onAnswer={() => {}} />);
    expect(screen.queryByTestId("recording-indicator")).toBe(null);
  });
});

describe("the host's button", () => {
  it("starts, stops, and says what is being saved", async () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<RecordButton recorderStatus={null} pendingParts={0} onStart={onStart} onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "הקלטה" }));
    rerender(<RecordButton recorderStatus="recording" pendingParts={0} onStart={onStart} onStop={onStop} />);
    await user.click(screen.getByRole("button", { name: "עצירת הקלטה" }));
    rerender(<RecordButton recorderStatus="saving" pendingParts={3} onStart={onStart} onStop={onStop} />);
    expect(screen.getByRole("button", { name: "שומר הקלטה… (3)" })).toBeDisabled();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
