import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import { donationsApi } from "../../../api/donationsApi";

const PRESET_AMOUNTS = [50, 100, 250, 500];

const DonateForm = () => {
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [type, setType] = useState("one_time");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const handleSubmit = async () => {
    if (!finalAmount || finalAmount < 10) return;
    setLoading(true);
    setMessage(null);
    try {
      // The returned clientSecret is a payment credential — it is meant to be
      // handed to Stripe.js, never rendered. Confirming the charge still needs
      // a Stripe Elements form; until that exists this only records the intent.
      await donationsApi.createIntent({
        amountCents: finalAmount * 100,
        currency: "ILS",
        type,
      });
      setMessage({ type: "success", text: "כוונת התשלום נוצרה בהצלחה." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "התשלום נכשל" });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" mb={1}>סוג תרומה</Typography>
        {/* "חודשי" is disabled rather than removed, and the server refuses it
            too. It was selectable and produced a ONE-OFF charge labelled
            monthly — a donor would have set up what they believed was a standing
            order and been billed once. Harmless today only because no card is
            ever collected; a trap the moment payments go live. Making it real
            needs a Stripe Subscription, which needs a saved payment method,
            which needs the Elements form this page does not have yet. */}
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
          inputProps={{ min: 10 }}
          sx={{ width: 160 }}
        />
      </Box>

      {message && <Alert severity={message.type}>{message.text}</Alert>}

      <Button variant="contained" size="large" onClick={handleSubmit} disabled={loading || !finalAmount}>
        {loading ? "מעבד..." : `תרומה ₪${finalAmount}`}
      </Button>

      <Typography variant="caption" color="text.secondary">
        תשלום מאובטח באמצעות Stripe. איננו שומרים את פרטי הכרטיס שלך.
      </Typography>
    </Box>
  );
};

export default DonateForm;
