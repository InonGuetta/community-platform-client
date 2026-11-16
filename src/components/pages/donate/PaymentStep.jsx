import { useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { formatAmount } from "./donationText";
import { useTranslation } from "react-i18next";

// The card (PRD PAY-1): Stripe's own Payment Element, mounted into the box
// below by the page controller. The fields are Stripe's iframes, so a card
// number is typed into Stripe and never into this app.
const PaymentStep = ({ intent, mountPayment, onPay, onBack, paying, error }) => {
  const { t } = useTranslation("donate");
  const container = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    let cleanup = () => {};
    let alive = true;
    mountPayment(container.current, theme).then((fn) => {
      if (alive) cleanup = fn;
      else fn();
    });
    return () => {
      alive = false;
      cleanup();
    };
  }, [mountPayment, theme]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {t("payment.of", { amount: formatAmount(intent.amountCents) })}
      </Typography>
      {/* Stripe draws its fields here; the min-height keeps the page from
          jumping while they load. */}
      <Box ref={container} data-testid="stripe-payment-element" sx={{ minHeight: 180 }} />
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <Button variant="contained" size="large" onClick={onPay} disabled={paying} sx={{ flex: 1, minWidth: 180 }}>
          {paying ? t("payment.processing") : t("payment.pay", { amount: formatAmount(intent.amountCents) })}
        </Button>
        <Button variant="outlined" size="large" onClick={onBack} disabled={paying}>{t("payment.back")}</Button>
      </Box>
    </Box>
  );
};

export default PaymentStep;
