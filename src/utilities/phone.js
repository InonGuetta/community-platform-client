// A phone number as the account page shows and takes it (migration 054). The
// server holds and validates E.164 ("+972545551234", lib/phone.js); this only
// presents it and tidies what is typed.

// An Israeli number the way Israelis write it: "054-555-1234". Any other is
// shown as stored — E.164 is readable in every country.
export const formatPhone = (e164) => {
  if (typeof e164 !== "string") return "";
  const israeli = /^\+972(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return israeli ? `0${israeli[1]}-${israeli[2]}-${israeli[3]}` : e164;
};

// The code's six digits from whatever was typed or pasted — "481 516",
// "481-516", or a whole SMS pasted in.
export const CODE_LENGTH = 6;
export const codeDigits = (value) => String(value ?? "").replace(/\D/g, "").slice(0, CODE_LENGTH);

// How long after one code another may be asked for, and how long a code lasts
// — the server's RESEND_AFTER_SECONDS and CODE_TTL_MINUTES
// (services/servicesPhone.js), which decide; these only time the countdown.
export const RESEND_AFTER_SECONDS = 60;
export const CODE_TTL_MINUTES = 10;
