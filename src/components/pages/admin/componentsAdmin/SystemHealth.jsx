import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import { useTranslation } from "react-i18next";
import { RADIUS } from "../../../../theme/tokens";

const HealthRow = ({ label, ok }) => {
  const { t } = useTranslation("admin");
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1.5, p: 2.5, bgcolor: "surface.fill2", borderRadius: `${RADIUS.menu}px` }}>
      <Typography component="span" fontWeight={700}>{label}</Typography>
      <StatusBadge tone={ok ? "success" : "error"} size="small">{ok ? t("health.ok") : t("health.down")}</StatusBadge>
    </Box>
  );
};

const SystemHealth = ({ health }) => {
  const { t } = useTranslation("admin");
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>{t("health.title")}</Typography>
      <HealthRow label={t("health.db")} ok={health?.db} />
      <HealthRow label={t("health.redis")} ok={health?.redis} />
    </Box>
  );
};

export default SystemHealth;
