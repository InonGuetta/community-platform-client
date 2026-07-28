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
      setMessage({ type: "success", text: `כוונת תשלום נוצרה (client_secret: ${data.clientSecret?.slice(0, 20)}...)` });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "התשלום נכשל" });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" mb={1}>סוג תרומה</Typography>
        <ToggleButtonGroup value={type} exclusive onChange={(_, v) => v && setType(v)} size="small">
          <ToggleButton value="one_time">חד פעמי</ToggleButton>
          <ToggleButton value="monthly">חודשי</ToggleButton>
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
