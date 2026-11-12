import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import DonateForm from "./DonateForm";
import PaymentStep from "./PaymentStep";
import DonationResult from "./DonationResult";
import MyDonations from "./MyDonations";
import { useDonatePageController } from "./useDonatePageController";

// A donation, start to finish (PRD PAY-1), and the donor's history (PAY-2).
// See useDonatePageController for the three steps.
const DonatePage = () => {
  const c = useDonatePageController();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 520, width: "100%" }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
          <Typography variant="h5" fontWeight={700}>תמכו בקהילה שלנו</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            התרומה שלך עוזרת לנו ליצור עוד תוכן ולשמור על הפלטפורמה חינמית לתלמידים.
          </Typography>
        </Box>

        {c.step === "amount" && <DonateForm onContinue={c.startPayment} starting={c.starting} error={c.error} />}
        {c.step === "pay" && (
          <PaymentStep
            intent={c.intent}
            mountPayment={c.mountPayment}
            onPay={c.pay}
            onBack={c.startOver}
            paying={c.paying}
            error={c.error}
          />
        )}
        {c.step === "done" && <DonationResult donation={c.result} onAgain={c.startOver} />}
      </Paper>

      <MyDonations history={c.history} />
    </Box>
  );
};

export default DonatePage;
