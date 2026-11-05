import { useCallback, useEffect, useRef, useState } from "react";
import { donationsApi } from "../../../api/donationsApi";
import { hebrewForError } from "../../../utilities/apiError";
import { loadStripeJs, elementsOptions } from "../../../utilities/stripeJs";

// Giving a real donation (PRD PAY-1, PAY-2), in three steps:
//
//   amount → the card, in Stripe's own fields → the result
//
// The server makes the PaymentIntent (and the pending row) when the donor
// moves past the amount; Stripe.js takes the card and confirms the payment
// itself — a card number never touches this app; and the server is then asked
// to bring the row in line with Stripe, so the result and "התרומות שלי" say
// what actually happened even before Stripe's webhook arrives.
//
// A bank's extra check (3-D Secure) may navigate away to the bank and back to
// /donate/result — see useDonateResultController — so the return address is
// passed to Stripe on every payment.

export const returnUrl = (donationId, origin = window.location.origin) =>
  `${origin}/donate/result?donation=${encodeURIComponent(donationId)}`;

// Pending rows in the history are asked about once on arrival — a payment
// confirmed in another tab, or a webhook that never reached this machine. Only
// the newest few: an abandoned intent stays pending forever, and is no news.
const SYNC_PENDING_LIMIT = 3;

export const useDonatePageController = () => {
  const [step, setStep] = useState("amount");
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState({ status: "loading", items: [] });
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const items = await donationsApi.myHistory();
      setHistory({ status: "ready", items });
      const pending = items.filter((d) => d.status === "pending" && d.stripe_payment_intent).slice(0, SYNC_PENDING_LIMIT);
      if (pending.length === 0) return;
      const synced = await Promise.all(pending.map((d) => donationsApi.sync(d.id).catch(() => d)));
      const byId = new Map(synced.map((d) => [d.id, d]));
      setHistory({ status: "ready", items: items.map((d) => byId.get(d.id) ?? d) });
    } catch {
      setHistory({ status: "failed", items: [] });
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const startPayment = async ({ amountCents, type = "one_time" }) => {
    setStarting(true);
    setError(null);
    try {
      const created = await donationsApi.createIntent({ amountCents, currency: "ILS", type });
      setIntent({ donationId: created.donation.id, amountCents, clientSecret: created.clientSecret, publishableKey: created.publishableKey });
      setStep("pay");
    } catch (err) {
      setError(hebrewForError(err?.response?.data, "לא ניתן להתחיל את התשלום. נסו שוב."));
    } finally {
      setStarting(false);
    }
  };

  // Puts Stripe's payment fields into `container`. Returns the cleanup.
  const mountPayment = useCallback(async (container, theme) => {
    if (!intent || !container) return () => {};
    try {
      const Stripe = await loadStripeJs();
      const stripe = Stripe(intent.publishableKey, { locale: "he" });
      const elements = stripe.elements(elementsOptions(intent.clientSecret, theme));
      const element = elements.create("payment", { layout: "tabs" });
      element.mount(container);
      stripeRef.current = stripe;
      elementsRef.current = elements;
      return () => element.destroy();
    } catch {
      setError("לא ניתן לטעון את טופס התשלום. בדקו את החיבור ונסו שוב.");
      return () => {};
    }
  }, [intent]);

  const pay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setPaying(true);
    setError(null);
    // "if_required": a card that needs no bank check is confirmed in place; one
    // that does goes to the bank and comes back to the return address.
    const { error: stripeError } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: returnUrl(intent.donationId) },
      redirect: "if_required",
    });
    if (stripeError) {
      // Stripe's own message, already in Hebrew ("הכרטיס נדחה"), and the form
      // stays for another attempt on the same donation.
      setError(stripeError.message || "התשלום לא עבר. נסו שוב.");
      setPaying(false);
      return;
    }
    const donation = await donationsApi.sync(intent.donationId).catch(() => null);
    setResult(donation ?? { id: intent.donationId, status: "pending", amount_cents: intent.amountCents, currency: "ILS" });
    setStep("done");
    setPaying(false);
    loadHistory();
  };

  const startOver = () => {
    setStep("amount");
    setIntent(null);
    setResult(null);
    setError(null);
    stripeRef.current = null;
    elementsRef.current = null;
  };

  return {
    step, intent, error, starting, paying, result, history,
    startPayment, mountPayment, pay, startOver,
  };
};
