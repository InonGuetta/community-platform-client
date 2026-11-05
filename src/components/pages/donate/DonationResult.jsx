import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { formatAmount, resultText } from "./donationText";

// How a donation ended (PRD PAY-1): thanks, still being checked, or did not go
// through — said by the row the server just brought in line with Stripe.
const DonationResult = ({ donation, onAgain }) => {
  const text = resultText(donation?.status);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "center" }} data-testid="donation-result">
      <Typography variant="h5" fontWeight={800}>{text.title}</Typography>
      {donation?.amount_cents ? (
        <Typography color="text.secondary">{formatAmount(donation.amount_cents, donation.currency)}</Typography>
      ) : null}
      <Alert severity={text.severity} sx={{ textAlign: "start" }}>{text.body}</Alert>
      {onAgain && (
        <Button variant={donation?.status === "failed" ? "contained" : "outlined"} onClick={onAgain}>
          {donation?.status === "failed" ? "לנסות שוב" : "תרומה נוספת"}
        </Button>
      )}
    </Box>
  );
};

export default DonationResult;
