import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InboxIcon from "@mui/icons-material/Inbox";

// `actionLabel` + `onAction` are optional: when both are provided the empty state
// offers a call-to-action button (e.g. "העלאת מדיה"). Existing callers that pass
// only `message` are unaffected — the button simply isn't rendered.
const NoDataDialog = ({ message = "אין נתונים להצגה", actionLabel, onAction }) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2, color: "text.secondary" }}>
    <InboxIcon sx={{ fontSize: 64, opacity: 0.4 }} />
    <Typography variant="h6">{message}</Typography>
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
        {actionLabel}
      </Button>
    )}
  </Box>
);

export default NoDataDialog;
