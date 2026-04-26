import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import axiosInstance from "../../../utilities/axiosInstance";

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
      const { data } = await axiosInstance.post("/donations/create-intent", {
        amountCents: finalAmount * 100,
        currency: "ILS",
        type,
      });
      setMessage({ type: "success", text: `Payment intent created (client_secret: ${data.clientSecret?.slice(0, 20)}...)` });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Payment failed" });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" mb={1}>Donation Type</Typography>
        <ToggleButtonGroup value={type} exclusive onChange={(_, v) => v && setType(v)} size="small">
          <ToggleButton value="one_time">One Time</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={1}>Amount (₪)</Typography>
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
          label="Custom amount"
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
        {loading ? "Processing..." : `Donate ₪${finalAmount}`}
      </Button>

      <Typography variant="caption" color="text.secondary">
        Secure payment powered by Stripe. We never store your card details.
      </Typography>
    </Box>
  );
};

export default DonateForm;
