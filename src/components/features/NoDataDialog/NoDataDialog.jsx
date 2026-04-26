import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InboxIcon from "@mui/icons-material/Inbox";

const NoDataDialog = ({ message = "No data available" }) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2, color: "text.secondary" }}>
    <InboxIcon sx={{ fontSize: 64, opacity: 0.4 }} />
    <Typography variant="h6">{message}</Typography>
  </Box>
);

export default NoDataDialog;
