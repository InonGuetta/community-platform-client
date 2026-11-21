import { useNavigate } from "react-router-dom";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import PeopleIcon from "@mui/icons-material/People";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import Box from "@mui/material/Box";
import { RADIUS, CARD_SHELL_SX } from "../../../../theme/tokens";
import { useTranslation } from "react-i18next";

// A KPI card (component 17): the figure in display type, its label above it,
// and a tile for the icon. The whole card is a link to where the figure lives.
const StatCard = ({ icon, label, value, to }) => {
  const navigate = useNavigate();
  return (
    <ButtonBase
      onClick={() => navigate(to)}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 2,
        p: 3,
        height: "100%",
        textAlign: "start",
        ...CARD_SHELL_SX,
        transition: "box-shadow 0.25s ease",
        "&:hover": { boxShadow: 2 },
      }}
    >
      <Box sx={{ display: "grid", placeItems: "center", width: 48, height: 48, flexShrink: 0, borderRadius: `${RADIUS.tile}px`, bgcolor: "surface.accentSoft", color: "primary.main" }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="kicker" component="p" sx={{ color: "text.secondary" }}>{label}</Typography>
        <Typography variant="display" component="p" sx={{ fontSize: 40, lineHeight: 1.1 }}>{value}</Typography>
      </Box>
    </ButtonBase>
  );
};

const StatsCards = ({ stats }) => {
  const { t } = useTranslation("admin");
  if (!stats) return null;

  const donationILS = stats.donations
    ? `₪${(stats.donations.totalCents / 100).toFixed(0)}`
    : "₪0";

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" }, gap: 3 }}>
      <StatCard icon={<PeopleIcon />} label={t("stats.activeUsers")} value={stats.users?.active ?? 0} to="/users" />
      <StatCard icon={<VideoLibraryIcon />} label={t("stats.totalMedia")} value={stats.media?.total ?? 0} to="/archive" />
      <StatCard icon={<VolunteerActivismIcon />} label={t("stats.totalDonations")} value={donationILS} to="/donate" />
    </Box>
  );
};

export default StatsCards;
