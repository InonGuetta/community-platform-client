import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import VerifiedIcon from "@mui/icons-material/Verified";
import { Trans, useTranslation } from "react-i18next";
import PhoneCodeDialog from "./PhoneCodeDialog";
import { usePhoneCard } from "./usePhoneCard";
import { formatPhone } from "../../../utilities/phone";

// A mobile number for notifications by SMS (PRD AUTH-13): added and proved with
// a code, changed, removed. Everything it does is usePhoneCard's.
const PhoneCard = () => {
  const { t } = useTranslation("profile");
  const card = usePhoneCard();
  const showForm = card.editing || !card.phone;
  const number = (value) => <Box component="bdi" dir="ltr" sx={{ fontWeight: 700 }}>{formatPhone(value)}</Box>;

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PhoneIphoneIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>{t("phone.title")}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">{t("phone.help")}</Typography>

        {card.phone && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body1">{number(card.phone)}</Typography>
            <Chip size="small" color="success" variant="outlined" icon={<VerifiedIcon />} label={t("phone.verified")} />
            {!card.editing && (
              <Box sx={{ display: "flex", gap: 1, marginInlineStart: "auto" }}>
                <Button size="small" onClick={card.startEdit}>{t("phone.change")}</Button>
                <Button size="small" color="error" onClick={card.askRemove}>{t("phone.remove")}</Button>
              </Box>
            )}
          </Box>
        )}

        {card.pending && !card.dialogOpen && (
          <Alert
            severity="info"
            action={<Button color="inherit" size="small" onClick={card.openDialog}>{t("phone.enterCode")}</Button>}
          >
            <Trans
              t={t}
              i18nKey="phone.pendingText"
              values={{ phone: formatPhone(card.pending) }}
              components={{ num: <Box component="bdi" dir="ltr" sx={{ fontWeight: 700 }} /> }}
            />
          </Alert>
        )}

        {showForm && (
          <Box component="form" onSubmit={card.send} sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
            <TextField
              label={card.phone ? t("phone.newLabel") : t("phone.label")}
              value={card.number}
              onChange={(e) => card.setNumber(e.target.value)}
              error={Boolean(card.numberError)}
              helperText={card.numberError || t("phone.hint")}
              disabled={card.sending}
              placeholder="050-123-4567"
              sx={{ flex: "1 1 220px" }}
              inputProps={{ type: "tel", inputMode: "tel", autoComplete: "tel", dir: "ltr", maxLength: 40 }}
            />
            <Box sx={{ display: "flex", gap: 1, pt: 1 }}>
              <Button type="submit" variant="contained" disabled={!card.number.trim() || card.sending} sx={{ fontWeight: 700, borderRadius: 2 }}>
                {card.sending ? <CircularProgress size={20} /> : t("phone.send")}
              </Button>
              {card.phone && <Button onClick={card.cancelEdit} disabled={card.sending}>{t("phone.cancel")}</Button>}
            </Box>
          </Box>
        )}
      </CardContent>

      <PhoneCodeDialog
        open={card.dialogOpen}
        phone={card.pending}
        code={card.code}
        error={card.codeError}
        verifying={card.verifying}
        sending={card.sending}
        resendIn={card.resendIn}
        onChange={card.changeCode}
        onVerify={() => card.verify()}
        onResend={card.resend}
        onClose={card.closeDialog}
      />

      <Dialog open={card.confirmRemove} onClose={card.cancelRemove} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("phone.removeTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("phone.removeBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={card.cancelRemove} disabled={card.removing}>{t("phone.cancel")}</Button>
          <Button color="error" variant="contained" onClick={card.remove} disabled={card.removing}>
            {card.removing ? <CircularProgress size={20} /> : t("phone.remove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PhoneCard;
