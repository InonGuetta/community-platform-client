// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import { donationsApi } from "../../../api/donationsApi";
import DonatePage from "./DonatePage";
import DonateResultPage from "./DonateResultPage";
import { formatAmount } from "./donationText";
import { returnUrl } from "./useDonatePageController";
import { resetStripeJsLoader } from "../../../utilities/stripeJs";

// A real donation (PRD PAY-1, PAY-2), with Stripe.js replaced by a stand-in
// that records what the page asks of it — the card itself never reaches this
// app, so there is nothing else to fake.

vi.mock("../../../api/donationsApi", () => ({
  donationsApi: { createIntent: vi.fn(), myHistory: vi.fn(), sync: vi.fn() },
}));

const fakeStripe = ({ confirmResult = {} } = {}) => {
  const calls = { keys: [], mounted: null, elementsOptions: null, confirm: [] };
  const element = { mount: (node) => { calls.mounted = node; }, destroy: vi.fn() };
  window.Stripe = (key) => {
    calls.keys.push(key);
    return {
      elements: (opts) => { calls.elementsOptions = opts; return { create: () => element }; },
      confirmPayment: async (args) => { calls.confirm.push(args); return confirmResult; },
    };
  };
  return calls;
};

const renderPage = (path = "/donate") =>
  render(
    <ThemeProvider theme={buildTheme("light")}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/donate/result" element={<DonateResultPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

const INTENT = { donation: { id: 41 }, clientSecret: "pi_1_secret_x", publishableKey: "pk_test_abc" };

beforeEach(() => {
  vi.clearAllMocks();
  resetStripeJsLoader();
  donationsApi.myHistory.mockResolvedValue([]);
});
afterEach(() => { delete window.Stripe; });

describe("giving a donation", () => {
  it("takes the card in Stripe's fields, confirms, and thanks the donor once Stripe says so", async () => {
    const stripe = fakeStripe();
    donationsApi.createIntent.mockResolvedValue(INTENT);
    donationsApi.sync.mockResolvedValue({ id: 41, status: "completed", amount_cents: 10000, currency: "ILS" });
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /המשך לתשלום ₪100/ }));
    expect(donationsApi.createIntent).toHaveBeenCalledWith({ amountCents: 10000, currency: "ILS", type: "one_time" });

    // Stripe.js started with the key the server sent, in Hebrew, its fields in
    // the box the page keeps for them.
    await waitFor(() => expect(stripe.mounted).toBe(screen.getByTestId("stripe-payment-element")));
    expect(stripe.keys).toEqual(["pk_test_abc"]);
    expect(stripe.elementsOptions).toMatchObject({ clientSecret: "pi_1_secret_x", locale: "he" });

    await user.click(screen.getByRole("button", { name: "תשלום ₪100" }));
    expect(stripe.confirm[0].redirect).toBe("if_required");
    expect(stripe.confirm[0].confirmParams.return_url).toBe(returnUrl(41));
    expect(await screen.findByText("תודה רבה!")).toBeInTheDocument();
    expect(donationsApi.sync).toHaveBeenCalledWith(41);
    // The history is read again, to show the new donation.
    await waitFor(() => expect(donationsApi.myHistory).toHaveBeenCalledTimes(2));
  });

  it("keeps the form, with Stripe's reason, when the card is declined", async () => {
    fakeStripe({ confirmResult: { error: { message: "הכרטיס נדחה." } } });
    donationsApi.createIntent.mockResolvedValue(INTENT);
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /המשך לתשלום/ }));
    await user.click(await screen.findByRole("button", { name: "תשלום ₪100" }));
    expect(await screen.findByText("הכרטיס נדחה.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "תשלום ₪100" })).toBeEnabled();
    expect(donationsApi.sync).not.toHaveBeenCalled();
  });

  it("says plainly when payments are not set up on the server", async () => {
    const err = new Error("503");
    err.response = { status: 503, data: { code: "PAYMENTS_NOT_CONFIGURED", message: "Payments are not set up" } };
    donationsApi.createIntent.mockRejectedValue(err);
    renderPage();
    await userEvent.setup().click(screen.getByRole("button", { name: /המשך לתשלום/ }));
    expect(await screen.findByText(/התשלומים באתר עוד לא הוגדרו/)).toBeInTheDocument();
  });

  it("refuses an amount below the minimum before asking anything", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("סכום מותאם"), "5");
    expect(screen.getByRole("button", { name: /המשך לתשלום/ })).toBeDisabled();
    expect(screen.getByText("הסכום המינימלי הוא ₪10")).toBeInTheDocument();
  });
});

describe("התרומות שלי", () => {
  it("lists each donation with its real status, asking Stripe about pending ones", async () => {
    donationsApi.myHistory.mockResolvedValue([
      { id: 2, amount_cents: 5000, currency: "ILS", status: "pending", stripe_payment_intent: "pi_2", created_at: "2026-11-05T10:00:00Z" },
      { id: 1, amount_cents: 18000, currency: "ILS", status: "completed", stripe_payment_intent: "pi_1", created_at: "2026-11-01T10:00:00Z" },
    ]);
    donationsApi.sync.mockResolvedValue({ id: 2, amount_cents: 5000, currency: "ILS", status: "completed", stripe_payment_intent: "pi_2", created_at: "2026-11-05T10:00:00Z" });
    renderPage();
    expect(await screen.findByText("התרומות שלי")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("הושלמה")).toHaveLength(2));
    expect(donationsApi.sync).toHaveBeenCalledTimes(1);
    expect(donationsApi.sync).toHaveBeenCalledWith(2);
    expect(screen.getByText(/₪180/)).toBeInTheDocument();
  });
});

describe("back from the bank's check", () => {
  it("checks the donation against Stripe before saying anything", async () => {
    donationsApi.sync.mockResolvedValue({ id: 41, status: "failed", amount_cents: 10000, currency: "ILS" });
    renderPage("/donate/result?donation=41&payment_intent=pi_1&redirect_status=failed");
    expect(await screen.findByText("התשלום לא עבר")).toBeInTheDocument();
    expect(donationsApi.sync).toHaveBeenCalledWith("41");
    expect(screen.getByRole("button", { name: "לנסות שוב" })).toBeInTheDocument();
  });
});

describe("amounts", () => {
  it("are whole shekels when whole", () => {
    expect(formatAmount(18000)).toBe("₪180");
    expect(formatAmount(1850)).toBe("₪18.50");
    expect(formatAmount(500, "usd")).toBe("$5");
  });
});
