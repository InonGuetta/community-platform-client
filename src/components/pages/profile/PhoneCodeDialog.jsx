import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Trans, useTranslation } from "react-i18next";
import { CODE_LENGTH, formatPhone } from "../../../utilities/phone";

// The six digits sent by SMS, typed back (usePhoneCard). autocomplete
// "one-time-code" is what lets a phone offer the code from the message, and
// six digits — typed, pasted or offered — are sent without a press.
const PhoneCodeDialog = ({ open, phone, code, error, verifying, sending, resendIn, onChange, onVerify, onResend, onClose }) => {
  const { t } = useTranslation("profile");
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onVerify(); }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("phone.dialog.title")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <Trans
              t={t}
              i18nKey="phone.dialog.body"
              values={{ phone: formatPhone(phone) }}
              components={{ num: <Box component="bdi" dir="ltr" sx={{ fontWeight: 700, color: "text.primary" }} /> }}
            />
          </Typography>
          <TextField
            autoFocus
            label={t("phone.dialog.codeLabel")}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            error={Boolean(error)}
            helperText={error || " "}
            // readOnly, not disabled, while the code is checked: a disabled field
            // loses the focus, and the next try after "wrong code" went nowhere.
            inputProps={{
              readOnly: verifying,
              inputMode: "numeric",
              autoComplete: "one-time-code",
              pattern: "[0-9]*",
              // Room for a whole SMS pasted in: codeDigits keeps the six digits.
              maxLength: 200,
              dir: "ltr",
              style: { textAlign: "center", fontSize: "1.6rem", letterSpacing: "0.5em", fontVariantNumeric: "tabular-nums" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          <Button onClick={onResend} disabled={resendIn > 0 || sending || verifying} sx={{ marginInlineEnd: "auto" }}>
            {sending ? <CircularProgress size={18} /> : resendIn > 0 ? t("phone.dialog.resendIn", { seconds: resendIn }) : t("phone.dialog.resend")}
          </Button>
          <Button onClick={onClose} disabled={verifying}>{t("phone.cancel")}</Button>
          <Button type="submit" variant="contained" disabled={code.length !== CODE_LENGTH || verifying} sx={{ fontWeight: 700 }}>
            {verifying ? <CircularProgress size={20} /> : t("phone.dialog.verify")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default PhoneCodeDialog;
