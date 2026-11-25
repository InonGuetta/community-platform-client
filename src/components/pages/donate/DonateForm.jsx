import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import NumberField from "../../features/NumberField/NumberField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import SegmentedControl from "../../features/SegmentedControl/SegmentedControl";
import { RADIUS } from "../../../theme/tokens";
import { useTranslation } from "react-i18next";

const PRESET_AMOUNTS = [50, 100, 250, 500];
// At least ₪10, the smallest gift worth Stripe's fixed fee, and a ceiling so a
// slipped key cannot become a charge nobody meant. The server refuses outside
// the same bounds (donationAmountCents in lib/validate.js, in cents).
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 100000;

// The first step of a donation (PRD PAY-1): how much. The card comes next, in
// Stripe's own fields — see PaymentStep. `onContinue({ amountCents, type })`.
const DonateForm = ({ onContinue, starting = false, error = null }) => {
  const { t } = useTranslation("donate");
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [type, setType] = useState("one_time");

  const finalAmount = customAmount ? Number(customAmount) : amount;
  const valid = Number.isFinite(finalAmount) && finalAmount >= MIN_AMOUNT && finalAmount <= MAX_AMOUNT;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" mb={1}>{t("form.type")}</Typography>
        {/* "חודשי" stays disabled, and the server refuses it too: a standing
            order needs a Stripe Subscription (PRD PAY-4), and until then
            choosing it would charge once under a monthly label. */}
        <SegmentedControl
          label={t("form.type")}
          value={type}
          onChange={setType}
          options={[
            { value: "one_time", label: t("form.oneTime") },
            { value: "monthly", label: t("form.monthly"), disabled: true, tooltip: t("form.monthlySoon") },
          ]}
        />
      </Box>
      <Box>
        <Typography variant="subtitle2" mb={1}>{t("form.amount")}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: `repeat(${PRESET_AMOUNTS.length}, 1fr)` }, gap: 1.5, mb: 2 }}>
          {PRESET_AMOUNTS.map((a) => {
            const selected = amount === a && !customAmount;
            return (
              <ButtonBase
                key={a}
                aria-pressed={selected}
                onClick={() => { setAmount(a); setCustomAmount(""); }}
                sx={{
                  height: 56,
                  borderRadius: `${RADIUS.menu}px`,
                  border: "2px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "surface.accentSoft" : "background.paper",
                  color: selected ? "primary.main" : "text.primary",
                  fontSize: 18,
                  fontWeight: 700,
                  transition: "border-color .2s, background-color .2s, color .2s",
                  "&:hover": { borderColor: selected ? "primary.main" : "surface.lineStrong" },
                }}
              >
                ₪{a}
              </ButtonBase>
            );
          })}
        </Box>
        <NumberField
          label={t("form.custom")}
          value={customAmount}
          onChange={(n) => { setCustomAmount(n === "" ? "" : String(n)); setAmount(0); }}
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          allowEmpty
          helperText=" "
          fullWidth
        />
      </Box>
      {error && <Alert severity="error">{error}</Alert>}

      <Button
        variant="contained"
        size="large"
        startIcon={<LockOutlinedIcon />}
        onClick={() => onContinue({ amountCents: Math.round(finalAmount * 100), type })}
        disabled={starting || !valid}
      >
        {starting ? t("form.preparing") : valid ? t("form.continue", { amount: finalAmount }) : t("form.enterAmount")}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        {t("form.secure")}
      </Typography>
    </Box>
  );
};

export default DonateForm;
