import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useTranslation } from "react-i18next";

const HealthRow = ({ label, ok }) => {
  const { t } = useTranslation("admin");
  return (
    <ListItem disablePadding>
      <ListItemIcon sx={{ minWidth: 36 }}>
        {ok ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
      </ListItemIcon>
      <ListItemText primary={label} secondary={ok ? t("health.ok") : t("health.down")} />
    </ListItem>
  );
};

const SystemHealth = ({ health }) => {
  const { t } = useTranslation("admin");
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={1}>{t("health.title")}</Typography>
      <List dense>
        <HealthRow label={t("health.db")} ok={health?.db} />
        <HealthRow label={t("health.redis")} ok={health?.redis} />
      </List>
    </Box>
  );
};

export default SystemHealth;
