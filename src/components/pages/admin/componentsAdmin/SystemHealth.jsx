import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const HealthRow = ({ label, ok }) => (
  <ListItem disablePadding>
    <ListItemIcon sx={{ minWidth: 36 }}>
      {ok ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
    </ListItemIcon>
    <ListItemText primary={label} secondary={ok ? "Healthy" : "Unavailable"} />
  </ListItem>
);

const SystemHealth = ({ health }) => (
  <Box>
    <Typography variant="h6" fontWeight={700} mb={1}>System Health</Typography>
    <List dense>
      <HealthRow label="Database (PostgreSQL)" ok={health?.db} />
      <HealthRow label="Cache (Redis)" ok={health?.redis} />
    </List>
  </Box>
);

export default SystemHealth;
