import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";

const PRESET_AMOUNTS = [50, 100, 250, 500];
// The server's floor is ₪1; the form asks for at least ₪10, the smallest gift
// worth Stripe's fixed fee.
const MIN_AMOUNT = 10;

// The first step of a donation (PRD PAY-1): how much. The card comes next, in
// Stripe's own fields — see PaymentStep. `onContinue({ amountCents, type })`.
const DonateForm = ({ onContinue, starting = false, error = null }) => {
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [type, setType] = useState("one_time");

  const finalAmount = customAmount ? Number(customAmount) : amount;
  const valid = Number.isFinite(finalAmount) && finalAmount >= MIN_AMOUNT;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" mb={1}>סוג תרומה</Typography>
        {/* "חודשי" stays disabled, and the server refuses it too: a standing
            order needs a Stripe Subscription (PRD PAY-4), and until then
            choosing it would charge once under a monthly label. */}
        <ToggleButtonGroup value={type} exclusive onChange={(_, v) => v && setType(v)} size="small">
          <ToggleButton value="one_time">חד פעמי</ToggleButton>
          <Tooltip title="תרומה חודשית תתאפשר בקרוב">
            <span>
              <ToggleButton value="monthly" disabled>חודשי</ToggleButton>
            </span>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={1}>סכום (₪)</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
          {PRESET_AMOUNTS.map((a) => (
            <Button
              key={a}
              variant={amount === a && !customAmount ? "contained" : "outlined"}
              onClick={() => { setAmount(a); setCustomAmount(""); }}
              size="small"
            >
              ₪{a}
            </Button>
          ))}
        </Box>
        <TextField
          label="סכום מותאם"
          type="number"
          value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
          size="small"
          inputProps={{ min: MIN_AMOUNT }}
          helperText={customAmount && !valid ? `הסכום המינימלי הוא ₪${MIN_AMOUNT}` : " "}
          error={Boolean(customAmount) && !valid}
          sx={{ width: 180 }}
        />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={() => onContinue({ amountCents: Math.round(finalAmount * 100), type })}
        disabled={starting || !valid}
      >
        {starting ? "מכין את התשלום..." : `המשך לתשלום ₪${valid ? finalAmount : ""}`}
      </Button>

      <Typography variant="caption" color="text.secondary">
        תשלום מאובטח באמצעות Stripe. פרטי הכרטיס מוקלדים ישירות אצל Stripe ואינם עוברים דרכנו.
      </Typography>
    </Box>
  );
};

export default DonateForm;
