import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SectionCard from "../../features/SectionCard/SectionCard";
import Chip from "@mui/material/Chip";
import { donationLine, statusOf } from "./donationText";
import { useTranslation } from "react-i18next";

// "התרומות שלי" (PRD PAY-2): every donation the reader made, with its real
// status — pending ones were just checked against Stripe by the controller.
const MyDonations = ({ history }) => {
  const { t } = useTranslation("donate");
  if (history.status !== "ready" || history.items.length === 0) return null;
  return (
    <SectionCard title={t("mine.title")} sx={{ maxWidth: 560, width: "100%" }}>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {history.items.map((d) => {
          const s = statusOf(d.status);
          return (
            <Box component="li" key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, borderBottom: 1, borderColor: "divider" }}>
              <Typography sx={{ flex: 1 }}>{donationLine(d)}</Typography>
              <Chip size="small" label={s.label} color={s.color} variant="outlined" />
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
};

export default MyDonations;
