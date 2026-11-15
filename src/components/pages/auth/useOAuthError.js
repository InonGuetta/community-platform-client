import { useSearchParams } from "react-router-dom";

// The server sends a failed provider sign-in back to /sign-in?error=<provider>_<why>
// — there is no JSON body to read on a redirect, so the reason travels in the
// URL. This words it. Anything unrecognised says nothing rather than guessing:
// the parameter is in the address bar, and anyone can type into it.
const PROVIDER_NAMES = { google: "Google", apple: "Apple", linkedin: "LinkedIn" };

export const oauthErrorText = (code) => {
  const match = /^(google|apple|linkedin|oauth)_(failed|unavailable)$/.exec(code ?? "");
  if (!match) return null;
  const [, provider, why] = match;
  const name = PROVIDER_NAMES[provider];
  if (why === "unavailable") {
    return `ההתחברות עם ${name} עדיין לא הוגדרה באתר. אפשר להתחבר בדרך אחרת.`;
  }
  return name
    ? `ההתחברות עם ${name} לא הצליחה. אפשר לנסות שוב או להתחבר בדרך אחרת.`
    : "ההתחברות לא הצליחה. אפשר לנסות שוב או להתחבר בדרך אחרת.";
};

export const useOAuthError = () => {
  const [searchParams] = useSearchParams();
  return oauthErrorText(searchParams.get("error"));
};
