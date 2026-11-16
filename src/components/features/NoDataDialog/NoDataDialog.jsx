import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InboxIcon from "@mui/icons-material/Inbox";
import { useTranslation } from "react-i18next";

// `actionLabel` + `onAction` are optional: when both are provided the empty state
// offers a call-to-action button (e.g. "upload media"). Existing callers that pass
// only `message` are unaffected — the button simply isn't rendered. Without a
// `message`, the shared "nothing to show".
const NoDataDialog = ({ message, actionLabel, onAction }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2, color: "text.secondary" }}>
      <InboxIcon sx={{ fontSize: 64, opacity: 0.4 }} />
      <Typography variant="h6">{message ?? t("noData")}</Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default NoDataDialog;
