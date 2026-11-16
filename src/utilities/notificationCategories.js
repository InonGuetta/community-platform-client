import i18n from "../i18n/i18n";

// What an email-notification category is called, and what it covers — the
// profile's switches and the unsubscribe page both read these, so the two
// cannot name a category differently. A category the client does not know
// yet is shown under its own key rather than hidden.
export const categoryLabel = (key) => i18n.t(`notifications:categories.${key}.label`, { defaultValue: key });
export const categoryHelp = (key) => i18n.t(`notifications:categories.${key}.help`, { defaultValue: "" });
