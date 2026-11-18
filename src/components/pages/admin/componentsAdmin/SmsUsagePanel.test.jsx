// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { adminApi } from "../../../../api/adminApi";
import SmsUsagePanel from "./SmsUsagePanel";

// The admin's SMS cost (PRD AUTH-13): the month's spend, the cap, what it went
// on — and, before all of it, whether anything was really sent.

vi.mock("../../../../api/adminApi", () => ({ adminApi: { smsUsage: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

it("says first that without a provider nothing was sent, then lists the month by kind", async () => {
  adminApi.smsUsage.mockResolvedValue({
    spentUsd: 0,
    capUsd: null,
    configured: false,
    byPurpose: [
      { purpose: "verification", messages: 3, failed: 0, segments: 3, cost_usd: 0 },
      { purpose: "sessions", messages: 2, failed: 1, segments: 4, cost_usd: 0 },
    ],
  });
  render(<SmsUsagePanel />);
  expect(await screen.findByText(/לא הוגדר ספק SMS/)).toBeTruthy();
  expect(screen.getByText("קודי אימות")).toBeTruthy();
  expect(screen.getByText("מפגשים חיים")).toBeTruthy();
  expect(screen.getByText(/לא הוגדרה תקרה חודשית/)).toBeTruthy();
});

it("shows the cap reached", async () => {
  adminApi.smsUsage.mockResolvedValue({ spentUsd: 20, capUsd: 20, configured: true, byPurpose: [] });
  render(<SmsUsagePanel />);
  expect(await screen.findByText(/התקרה החודשית הושגה/)).toBeTruthy();
  expect(screen.queryByText(/לא הוגדר ספק SMS/)).toBeNull();
});
