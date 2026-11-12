// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { adminApi } from "../../../../api/adminApi";
import AiUsagePanel from "./AiUsagePanel";
import { formatUsd, formatUsage, capProgress, purposeLabel } from "./aiUsageFormat";

// The admin's AI cost panel (PRD ADM-1, NFR-3).

vi.mock("../../../../api/adminApi", () => ({ adminApi: { aiUsage: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("the wording", () => {
  it("rounds to the cent, and does not call a real cost zero", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(0.004)).toBe("פחות מסנט");
    expect(formatUsd(12.345)).toBe("$12.35");
  });

  it("states Whisper in minutes and the rest in thousands of tokens", () => {
    expect(formatUsage({ audio_seconds: 3600 })).toBe("60 דקות שמע");
    expect(formatUsage({ input_tokens: 2500, output_tokens: 500 })).toBe("3.0 אלף טוקנים");
  });

  it("warns at 80% of the cap and alarms at 100%", () => {
    expect(capProgress(10, null)).toBeNull();
    expect(capProgress(40, 100).severity).toBe("primary");
    expect(capProgress(85, 100).severity).toBe("warning");
    expect(capProgress(130, 100)).toEqual({ percent: 100, severity: "error" });
  });

  it("names a purpose it does not know rather than hiding it", () => {
    expect(purposeLabel("chat")).toBe("דיון עם AI");
    expect(purposeLabel("something_new")).toBe("something_new");
  });
});

describe("the panel", () => {
  it("shows the month, the cap and each purpose", async () => {
    adminApi.aiUsage.mockResolvedValue({
      spentUsd: 42.5,
      capUsd: 50,
      byPurpose: [
        { purpose: "transcription", calls: 12, audio_seconds: 7200, input_tokens: 0, output_tokens: 0, cost_usd: 0.72 },
        { purpose: "summary", calls: 30, audio_seconds: 0, input_tokens: 400000, output_tokens: 20000, cost_usd: 1.2 },
      ],
      byDay: [],
    });
    render(<AiUsagePanel />);
    expect(await screen.findByText("$42.50")).toBeTruthy();
    expect(screen.getByText(/מתוך תקרה של \$50\.00 · 85%/)).toBeTruthy();
    expect(screen.getByText("תמלול (Whisper)")).toBeTruthy();
    expect(screen.getByText("120 דקות שמע")).toBeTruthy();
    expect(screen.getByText("סיכום ונקודות מפתח")).toBeTruthy();
  });

  it("says plainly when the cap is reached, and that the chat still works", async () => {
    adminApi.aiUsage.mockResolvedValue({ spentUsd: 60, capUsd: 50, byPurpose: [], byDay: [] });
    render(<AiUsagePanel />);
    expect(await screen.findByText(/התקרה החודשית הושגה/)).toBeTruthy();
    expect(screen.getByText(/הצ׳אט ממשיך לעבוד/)).toBeTruthy();
  });

  it("with no cap, says how to set one", async () => {
    adminApi.aiUsage.mockResolvedValue({ spentUsd: 0, capUsd: null, byPurpose: [], byDay: [] });
    render(<AiUsagePanel />);
    expect(await screen.findByText(/AI_MONTHLY_CAP_USD/)).toBeTruthy();
    expect(screen.getByText("החודש עוד לא היה שימוש ב‑AI.")).toBeTruthy();
  });
});
