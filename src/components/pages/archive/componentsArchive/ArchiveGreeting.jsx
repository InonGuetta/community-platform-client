import { Trans, useTranslation } from "react-i18next";
import { useGreeting } from "./useGreeting";

// "בוקר טוב, דנה" / "Good evening, Dana" — the part of the day on the reader's
// clock, in the interface language, with the display name as they wrote it
// (<bdi>: a Hebrew name in an English sentence keeps its own direction).
//
// The archive's kicker (decision 1, step 1: "kicker ברכה"): plain text that
// PageHeader sets small, in the accent, above the title. It was a large
// gradient line with a sun or a moon beside it before Redesign v4.
const ArchiveGreeting = ({ name }) => {
  const { t } = useTranslation("archive");
  const part = useGreeting();
  const greeting = t(`greeting.${part}`);

  return name ? (
    <Trans t={t} i18nKey="greeting.named" values={{ greeting, name }} components={{ name: <bdi /> }} />
  ) : (
    greeting
  );
};

export default ArchiveGreeting;
