import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";
import AvatarEditor from "./AvatarEditor";
import { useTranslation } from "react-i18next";
import { useWelcomeAvatar } from "./useWelcomeAvatar";

// "Welcome — would you like a profile picture?", once, right after signing up.
// Never a step that must be finished: "later" closes it, and the account page
// holds the same control for whenever they want it.
const WelcomeAvatarDialog = () => {
  const { t } = useTranslation("profile");
  const { open, name, hasPicture, close } = useWelcomeAvatar();

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle onClose={close}>
        {/* The name is what the person typed — its own direction. */}
        <span dir="auto">{name ? t("avatar.welcome.title", { name }) : t("avatar.welcome.titleNoName")}</span>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3 }}>{t("avatar.welcome.body")}</Typography>
        <AvatarEditor size={96} layout="column" />
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 3, textAlign: "center" }}>
          {t("avatar.welcome.where")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} variant={hasPicture ? "contained" : "text"} sx={{ borderRadius: 2 }}>
          {hasPicture ? t("avatar.welcome.done") : t("avatar.welcome.later")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeAvatarDialog;
