import Typography from "@mui/material/Typography";
import { Trans, useTranslation } from "react-i18next";
import { useGreeting } from "./useGreeting";

// "בוקר טוב, דנה" / "Good evening, Dana" — the part of the day on the reader's
// clock, in the interface language, with the display name as they wrote it
// (<bdi>: a Hebrew name in an English sentence keeps its own direction).
const ArchiveGreeting = ({ name }) => {
  const { t } = useTranslation("archive");
  const part = useGreeting();
  const greeting = t(`greeting.${part}`);

  return (
    <Typography
      variant="h6"
      component="p"
      color="text.secondary"
      fontWeight={600}
      sx={{ flex: "1 1 auto", minWidth: 0, textAlign: { xs: "start", md: "center" } }}
    >
      {name ? (
        <Trans t={t} i18nKey="greeting.named" values={{ greeting, name }} components={{ name: <bdi /> }} />
      ) : (
        greeting
      )}
    </Typography>
  );
};

export default ArchiveGreeting;
