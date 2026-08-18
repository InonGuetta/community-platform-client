// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PipelineTrouble from "./PipelineTrouble";
import DonationsLedger from "./DonationsLedger";

// The two panels added so an admin can see what the dashboard had only ever
// counted. Both are presentational, so both are rendered directly — no store, no
// router, no network.

describe("what broke in the pipeline", () => {
  const failed = (over = {}) => ({
    queue: "transcription",
    id: "42",
    mediaId: 7,
    attempts: 1,
    failedAt: "2026-08-12T09:00:00.000Z",
    reason: "ffmpeg failed: Invalid data found when processing input",
    ...over,
  });

  test("shows the reason, which is the whole diagnostic", () => {
    render(
      <PipelineTrouble
        trouble={{ failed: { transcription: [failed()], llm: [] }, stranded: [] }}
        onReconciled={vi.fn()}
      />
    );
    // The queue panel beside this has reported a failed COUNT since the
    // dashboard was built. A count says something is wrong and nothing about
    // what.
    expect(screen.getByText(/ffmpeg failed/)).toBeTruthy();
  });

  test("both queues are shown together", () => {
    render(
      <PipelineTrouble
        trouble={{
          failed: {
            transcription: [failed()],
            llm: [failed({ queue: "llm", id: "9", reason: "rate limited" })],
          },
          stranded: [],
        }}
        onReconciled={vi.fn()}
      />
    );
    expect(screen.getByText(/עבודות שנכשלו \(2\)/)).toBeTruthy();
    expect(screen.getByText(/rate limited/)).toBeTruthy();
  });

  // null from the server means "could not reach Redis", which is the OPPOSITE of
  // "nothing failed" — and rendering it as an empty list would send an admin off
  // reassured while the queue is unreachable.
  test("an unreachable queue is not reported as a clean one", () => {
    render(
      <PipelineTrouble
        trouble={{ failed: { transcription: null, llm: null }, stranded: [] }}
        onReconciled={vi.fn()}
      />
    );
    expect(screen.getByText(/לא ניתן לקרוא את התור/)).toBeTruthy();
  });

  test("a genuinely clean pipeline says so", () => {
    render(
      <PipelineTrouble
        trouble={{ failed: { transcription: [], llm: [] }, stranded: [] }}
        onReconciled={vi.fn()}
      />
    );
    expect(screen.getByText("אין עבודות שנכשלו.")).toBeTruthy();
    expect(screen.queryByText(/לא ניתן לקרוא את התור/)).toBe(null);
  });

  // Media that was never queued leaves no failed job to find. It is the case the
  // reconcile sweep exists for, which is why the two are shown side by side.
  test("media with no usable transcript is listed separately", () => {
    render(
      <PipelineTrouble
        trouble={{
          failed: { transcription: [], llm: [] },
          stranded: [{ id: 3, title: "שיעור בלי תמלול", status: "error", error_message: "no audio" }],
        }}
        onReconciled={vi.fn()}
      />
    );
    expect(screen.getByText(/מדיה ללא תמלול תקין \(1\)/)).toBeTruthy();
    expect(screen.getByText("שיעור בלי תמלול")).toBeTruthy();
  });

  describe("the reconcile button", () => {
    const clean = { failed: { transcription: [], llm: [] }, stranded: [] };

    // Every queued job is a real Whisper bill, so it asks first.
    test("does nothing until it is confirmed", async () => {
      const user = userEvent.setup();
      const onReconciled = vi.fn();
      render(<PipelineTrouble trouble={clean} onReconciled={onReconciled} />);

      await user.click(screen.getByRole("button", { name: /הרצת סנכרון/ }));
      expect(onReconciled).not.toHaveBeenCalled();

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/חיוב אמיתי מול Whisper/)).toBeTruthy();
    });

    test("cancelling leaves it alone", async () => {
      const user = userEvent.setup();
      const onReconciled = vi.fn();
      render(<PipelineTrouble trouble={clean} onReconciled={onReconciled} />);

      await user.click(screen.getByRole("button", { name: /הרצת סנכרון/ }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "ביטול" }));

      expect(onReconciled).not.toHaveBeenCalled();
    });

    test("confirming runs it and reports what it did", async () => {
      const user = userEvent.setup();
      const onReconciled = vi.fn().mockResolvedValue({ found: 3, queued: [1, 2], deferred: 1 });
      render(<PipelineTrouble trouble={clean} onReconciled={onReconciled} />);

      await user.click(screen.getByRole("button", { name: /הרצת סנכרון/ }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "הרצה" }));

      await waitFor(() => expect(onReconciled).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(/נמצאו 3, הוכנסו לתור 2/)).toBeTruthy();
    });

    test("a failure is reported rather than swallowed", async () => {
      const user = userEvent.setup();
      const onReconciled = vi.fn().mockRejectedValue(new Error("nope"));
      render(<PipelineTrouble trouble={clean} onReconciled={onReconciled} />);

      await user.click(screen.getByRole("button", { name: /הרצת סנכרון/ }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "הרצה" }));

      expect(await screen.findByText("הסנכרון נכשל")).toBeTruthy();
    });
  });
});

describe("the donations ledger", () => {
  const donation = (over = {}) => ({
    id: 1,
    amount_cents: 5000,
    currency: "ILS",
    type: "one_time",
    status: "completed",
    created_at: "2026-08-01T10:00:00.000Z",
    stripe_payment_intent: "pi_abc123",
    donor_name: "רחל",
    donor_email: "rachel@example.com",
    ...over,
  });

  test("names the donor and the amount, which the stats card never could", () => {
    render(<DonationsLedger donations={[donation()]} totals={[]} />);
    expect(screen.getByText("רחל")).toBeTruthy();
    expect(screen.getByText("₪50.00")).toBeTruthy();
  });

  // The reference is what makes the list reconcilable — it is the id to paste
  // into Stripe's dashboard, which is the whole point of the panel.
  test("shows the Stripe reference", () => {
    render(<DonationsLedger donations={[donation()]} totals={[]} />);
    expect(screen.getByText("pi_abc123")).toBeTruthy();
  });

  test("a donor with no display name falls back to their address", () => {
    render(<DonationsLedger donations={[donation({ donor_name: null })]} totals={[]} />);
    expect(screen.getByText("rachel@example.com")).toBeTruthy();
  });

  // The totals come from a GROUP BY over the whole table, not from summing the
  // bounded list — which would under-report the moment there are more donations
  // than the query's limit.
  test("the totals are shown as given, not recomputed from the rows", () => {
    render(
      <DonationsLedger
        donations={[donation()]}
        totals={[{ status: "completed", count: 40, total_cents: 250000 }]}
      />
    );
    expect(screen.getByText(/הושלם: ₪2500.00 \(40\)/)).toBeTruthy();
  });

  test("filtering narrows the rows", async () => {
    const user = userEvent.setup();
    render(
      <DonationsLedger
        donations={[donation(), donation({ id: 2, status: "failed", donor_name: "שמעון" })]}
        totals={[]}
      />
    );
    expect(screen.getByText("שמעון")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "הושלם" }));

    expect(screen.queryByText("שמעון")).toBe(null);
    expect(screen.getByText("רחל")).toBeTruthy();
  });

  test("an empty ledger says so", () => {
    render(<DonationsLedger donations={[]} totals={[]} />);
    expect(screen.getByText("אין תרומות להצגה.")).toBeTruthy();
  });

  // A euro donation labelled ₪ is worse than one with no symbol at all.
  test("each row is shown in its own currency", () => {
    render(<DonationsLedger donations={[donation({ currency: "USD", amount_cents: 2500 })]} totals={[]} />);
    expect(screen.getByText("$25.00")).toBeTruthy();
  });
});
