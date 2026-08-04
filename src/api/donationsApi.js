import axiosInstance from "../utilities/axiosInstance";

export const donationsApi = {
  // Answers { clientSecret } — a payment credential meant to be handed to
  // Stripe.js and never rendered. The current caller deliberately ignores the
  // body: confirming a charge still needs a Stripe Elements form, so for now
  // this only records the intent.
  createIntent: async ({ amountCents, currency = "ILS", type }) =>
    (await axiosInstance.post("/donations/create-intent", { amountCents, currency, type })).data,
};
