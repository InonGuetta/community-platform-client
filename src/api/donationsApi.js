import axiosInstance from "../utilities/axiosInstance";

export const donationsApi = {
  // Answers { donation, clientSecret, publishableKey } (PRD PAY-1). The secret
  // is a payment credential for Stripe.js and is never rendered; the
  // publishable key starts Stripe.js — both come from the server's .env, so
  // the two cannot be set to different accounts. 503 PAYMENTS_NOT_CONFIGURED
  // while the keys are placeholders.
  createIntent: async ({ amountCents, currency = "ILS", type }) =>
    (await axiosInstance.post("/donations/create-intent", { amountCents, currency, type })).data,

  // The donor's own donations, newest first (PRD PAY-2).
  myHistory: async () => (await axiosInstance.get("/donations/my-history")).data,

  // The donor's own donation checked against Stripe, after paying — the webhook
  // is the authority but may not have arrived yet. Answers the row.
  sync: async (donationId) => (await axiosInstance.post(`/donations/${donationId}/sync`)).data,
};
