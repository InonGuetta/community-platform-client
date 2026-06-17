import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import PeopleIcon from "@mui/icons-material/People";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import Box from "@mui/material/Box";

const StatCard = ({ icon, label, value, color, to }) => {
  const navigate = useNavigate();
  return (
    <Card
      sx={{
        height: "100%",
        // Bottom color accent grows in on hover; card lifts slightly.
        borderBottom: "3px solid transparent",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          borderBottomColor: `${color}.main`,
        },
      }}
    >
      <CardActionArea onClick={() => navigate(to)} sx={{ height: "100%" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ bgcolor: `${color}.light`, p: 1.5, borderRadius: 2, color: `${color}.dark` }}>{icon}</Box>
            <Box>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h5" fontWeight={700}>{value}</Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const donationILS = stats.donations
    ? `₪${(stats.donations.totalCents / 100).toFixed(0)}`
    : "₪0";

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <StatCard icon={<PeopleIcon />} label="Active Users" value={stats.users?.active ?? 0} color="primary" to="/users" />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard icon={<VideoLibraryIcon />} label="Total Media" value={stats.media?.total ?? 0} color="secondary" to="/archive" />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard icon={<VolunteerActivismIcon />} label="Total Donations" value={donationILS} color="success" to="/donate" />
      </Grid>
    </Grid>
  );
};

export default StatsCards;
