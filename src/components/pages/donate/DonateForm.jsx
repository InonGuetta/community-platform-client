import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import SegmentedControl from "../../features/SegmentedControl/SegmentedControl";
import { RADIUS } from "../../../theme/tokens";
import { useTranslation } from "react-i18next";

const PRESET_AMOUNTS = [50, 100, 250, 500];
// The server's floor is ₪1; the form asks for at least ₪10, the smallest gift
// worth Stripe's fixed fee.
const MIN_AMOUNT = 10;

// The first step of a donation (PRD PAY-1): how much. The card comes next, in
// Stripe's own fields — see PaymentStep. `onContinue({ amountCents, type })`.
const DonateForm = ({ onContinue, starting = false, error = null }) => {
  const { t } = useTranslation("donate");
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [type, setType] = useState("one_time");

  const finalAmount = customAmount ? Number(customAmount) : amount;
  const valid = Number.isFinite(finalAmount) && finalAmount >= MIN_AMOUNT;

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
        <TextField
          label={t("form.custom")}
          type="number"
          value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
          inputProps={{ min: MIN_AMOUNT }}
          helperText={customAmount && !valid ? t("form.minimum", { min: MIN_AMOUNT }) : " "}
          error={Boolean(customAmount) && !valid}
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
        {starting ? t("form.preparing") : t("form.continue", { amount: valid ? finalAmount : "" })}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        {t("form.secure")}
      </Typography>
    </Box>
  );
};

export default DonateForm;
