import { formatHebrewDate } from "../../../utilities/formatDate";

// The words of the donate page (PRD PAY-1, PAY-2), apart from its layout.

const SYMBOL = { ILS: "₪", USD: "$", EUR: "€" };

// "₪180" — whole shekels shown whole, agorot only when there are any.
export const formatAmount = (cents, currency = "ILS") => {
  const value = (Number(cents) || 0) / 100;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${SYMBOL[String(currency).toUpperCase()] ?? ""}${text}`;
};

export const STATUS_TEXT = {
  completed: { label: "הושלמה", color: "success" },
  pending: { label: "ממתינה", color: "warning" },
  failed: { label: "לא עברה", color: "error" },
};

export const statusOf = (status) => STATUS_TEXT[status] ?? { label: status, color: "default" };

export const donationLine = (d) => `${formatAmount(d.amount_cents, d.currency)} · ${formatHebrewDate(d.created_at)}`;

// What the result screen says, by how the payment ended.
export const RESULT_TEXT = {
  completed: {
    title: "תודה רבה!",
    body: "התרומה התקבלה. קבלה תישלח אליכם במייל.",
    severity: "success",
  },
  pending: {
    title: "התשלום בבדיקה",
    body: "התשלום עוד לא אושר סופית. הסטטוס יתעדכן ב״התרומות שלי״ ברגע שיתקבל אישור.",
    severity: "info",
  },
  failed: {
    title: "התשלום לא עבר",
    body: "לא נגבה כסף. אפשר לנסות שוב, עם אותו כרטיס או עם כרטיס אחר.",
    severity: "error",
  },
};

export const resultText = (status) => RESULT_TEXT[status] ?? RESULT_TEXT.pending;
