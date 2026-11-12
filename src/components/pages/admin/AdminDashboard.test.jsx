// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The admin dashboard: one overview, loaded on arrival and every 30 seconds,
// shown as a set of panels; a failed load says so above whatever was last
// shown; the reconcile button reloads once its sweep is done. The two panels
// with loads of their own (AI cost, tag proposals) are stood in for — they are
// tested where they live.

const overview = vi.hoisted(() => vi.fn());
const reconcile = vi.hoisted(() => vi.fn());

vi.mock("../../../api/adminApi", () => ({
  adminApi: { overview: (...args) => overview(...args), reconcile: (...args) => reconcile(...args) },
}));
vi.mock("./componentsAdmin/AiUsagePanel", () => ({ default: () => <div data-testid="ai-usage" /> }));
vi.mock("./componentsAdmin/TagProposals", () => ({ default: () => <div data-testid="tag-proposals" /> }));

import AdminDashboard from "./AdminDashboard";

const OVERVIEW = (activeUsers = 12) => ({
  stats: { users: { active: activeUsers }, media: { total: 31 }, donations: { totalCents: 50000 } },
  queueStatus: { transcription: { waiting: 0, active: 0, failed: 0 }, llm: { waiting: 0, active: 0, failed: 0 } },
  health: { database: "ok", redis: "ok" },
  trouble: { failed: { transcription: [], llm: [] }, stranded: [] },
  donations: { donations: [], totals: [] },
});

const renderDashboard = () => render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  overview.mockResolvedValue(OVERVIEW());
});
afterEach(() => vi.useRealTimers());

describe("the overview", () => {
  test("a spinner until the first load answers, then the panels with what it said", async () => {
    renderDashboard();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(await screen.findByText("לוח בקרה ניהולי")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("₪500")).toBeInTheDocument();
    expect(screen.getByTestId("ai-usage")).toBeInTheDocument();
    expect(screen.getByTestId("tag-proposals")).toBeInTheDocument();
    expect(overview).toHaveBeenCalledTimes(1);
  });

  test("a failed load is said out loud, in the server's words", async () => {
    overview.mockRejectedValue({ response: { data: { message: "אין הרשאה" } } });
    renderDashboard();
    expect(await screen.findByText("אין הרשאה — הנתונים המוצגים עשויים להיות לא מעודכנים.")).toBeInTheDocument();
  });

  test("…or in its own when the server gave none", async () => {
    overview.mockRejectedValue(new Error("Network Error"));
    renderDashboard();
    expect(await screen.findByText("לא ניתן לטעון את נתוני הניהול — הנתונים המוצגים עשויים להיות לא מעודכנים.")).toBeInTheDocument();
  });

  test("is loaded again every 30 seconds, and a success clears an earlier failure", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    overview.mockRejectedValueOnce(new Error("Network Error"));
    const view = renderDashboard();
    await screen.findByText(/לא ניתן לטעון את נתוני הניהול/);

    overview.mockResolvedValue(OVERVIEW(13));
    await act(async () => { vi.advanceTimersByTime(30000); });
    await waitFor(() => expect(screen.getByText("13")).toBeInTheDocument());
    expect(screen.queryByText(/לא ניתן לטעון את נתוני הניהול/)).not.toBeInTheDocument();
    expect(overview).toHaveBeenCalledTimes(2);

    // And stops when the page is left.
    view.unmount();
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(overview).toHaveBeenCalledTimes(2);
  });
});

test("the reconcile sweep, once done, reloads the overview and reports what it did", async () => {
  reconcile.mockResolvedValue({ found: 3, queued: [1, 2] });
  renderDashboard();
  fireEvent.click(await screen.findByRole("button", { name: "הרצת סנכרון" }));
  overview.mockResolvedValue(OVERVIEW(14));
  fireEvent.click(await screen.findByRole("button", { name: "הרצה" }));
  expect(await screen.findByText("נמצאו 3, הוכנסו לתור 2")).toBeInTheDocument();
  expect(reconcile).toHaveBeenCalledTimes(1);
  expect(overview).toHaveBeenCalledTimes(2);
  expect(screen.getByText("14")).toBeInTheDocument();
});
