import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import DonationResult from "./DonationResult";
import { donationsApi } from "../../../api/donationsApi";

// Where a donor lands after their bank's extra check (3-D Secure) sent them
// away from the page (PRD PAY-1): Stripe returns them to
// /donate/result?donation=<id>, and the donation is checked against Stripe
// before anything is said about it.
export const useDonateResultController = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const donationId = params.get("donation");
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    if (!donationId) {
      setDonation({ status: "failed" });
      return;
    }
    let current = true;
    donationsApi.sync(donationId)
      .then((row) => { if (current) setDonation(row); })
      .catch(() => { if (current) setDonation({ status: "pending" }); });
    return () => { current = false; };
  }, [donationId]);

  return { donation, again: () => navigate("/donate") };
};

const DonateResultPage = () => {
  const c = useDonateResultController();
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", justifyContent: "center" }}>
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 520, width: "100%" }}>
        {c.donation ? <DonationResult donation={c.donation} onAgain={c.again} /> : (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
        )}
      </Paper>
    </Box>
  );
};

export default DonateResultPage;
