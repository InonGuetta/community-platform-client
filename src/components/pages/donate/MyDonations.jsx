import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { donationLine, statusOf } from "./donationText";

// "התרומות שלי" (PRD PAY-2): every donation the reader made, with its real
// status — pending ones were just checked against Stripe by the controller.
const MyDonations = ({ history }) => {
  if (history.status !== "ready" || history.items.length === 0) return null;
  return (
    <Paper sx={{ p: 3, maxWidth: 520, width: "100%" }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>התרומות שלי</Typography>
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
    </Paper>
  );
};

export default MyDonations;
