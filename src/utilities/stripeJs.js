// Stripe.js, loaded on the donate page only (PRD PAY-1).
//
// Stripe requires the library to be loaded from js.stripe.com itself — never
// bundled — so that card numbers are typed into Stripe's own frames and never
// pass through this app. That is all @stripe/stripe-js does too; a script tag
// is the same thing with no dependency to install.
//
// Loaded once, on demand: nobody who never opens the donate page downloads it.

export const STRIPE_JS_URL = "https://js.stripe.com/v3/";

let loading = null;

export const loadStripeJs = (doc = typeof document !== "undefined" ? document : undefined) => {
  if (typeof window !== "undefined" && window.Stripe) return Promise.resolve(window.Stripe);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!doc) {
      reject(new Error("no document to load Stripe.js into"));
      return;
    }
    const script = doc.createElement("script");
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js loaded without Stripe")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Stripe.js could not be loaded"));
    };
    doc.head.appendChild(script);
  });
  return loading;
};

// For tests: forget a load in progress.
export const resetStripeJsLoader = () => { loading = null; };

// Stripe's own fields, made to look like the app's — the colours of the theme,
// right to left, in Hebrew.
export const elementsOptions = (clientSecret, theme) => ({
  clientSecret,
  locale: "he",
  appearance: {
    theme: theme?.palette?.mode === "dark" ? "night" : "stripe",
    variables: {
      colorPrimary: theme?.palette?.primary?.main ?? "#1a4a66",
      borderRadius: "8px",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
});
