import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import DonateForm from "./DonateForm";

const DonatePage = () => (
  <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
    <Paper sx={{ p: 4, maxWidth: 520, width: "100%" }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <VolunteerActivismIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
        <Typography variant="h5" fontWeight={700}>תמכו בקהילה שלנו</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          התרומה שלך עוזרת לנו ליצור עוד תוכן ולשמור על הפלטפורמה חינמית לתלמידים.
        </Typography>
      </Box>
      <DonateForm />
    </Paper>
  </Box>
);

export default DonatePage;
