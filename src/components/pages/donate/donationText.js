import { formatDate } from "../../../utilities/formatDate";
import i18n from "../../../i18n/i18n";

// The words of the donate page (PRD PAY-1, PAY-2), apart from its layout.

const SYMBOL = { ILS: "₪", USD: "$", EUR: "€" };

// "₪180" — whole shekels shown whole, agorot only when there are any.
export const formatAmount = (cents, currency = "ILS") => {
  const value = (Number(cents) || 0) / 100;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${SYMBOL[String(currency).toUpperCase()] ?? ""}${text}`;
};

const STATUS_COLOR = { completed: "success", pending: "warning", failed: "error" };

// A donation's status as a chip says it, in the current language.
export const statusOf = (status) =>
  STATUS_COLOR[status]
    ? { label: i18n.t(`donate:status.${status}`), color: STATUS_COLOR[status] }
    : { label: status, color: "default" };

export const donationLine = (d) => `${formatAmount(d.amount_cents, d.currency)} · ${formatDate(d.created_at)}`;

// What the result screen says, by how the payment ended.
const RESULT_SEVERITY = { completed: "success", pending: "info", failed: "error" };

export const resultText = (status) => {
  const known = RESULT_SEVERITY[status] ? status : "pending";
  return {
    title: i18n.t(`donate:result.${known}.title`),
    body: i18n.t(`donate:result.${known}.body`),
    severity: RESULT_SEVERITY[known],
  };
};
