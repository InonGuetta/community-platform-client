import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import PeopleIcon from "@mui/icons-material/People";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import Box from "@mui/material/Box";

const StatCard = ({ icon, label, value, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ bgcolor: `${color}.light`, p: 1.5, borderRadius: 2, color: `${color}.dark` }}>{icon}</Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const donationILS = stats.donations
    ? `₪${(stats.donations.totalCents / 100).toFixed(0)}`
    : "₪0";

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <StatCard icon={<PeopleIcon />} label="Active Users" value={stats.users?.active ?? 0} color="primary" />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard icon={<VideoLibraryIcon />} label="Total Media" value={stats.media?.total ?? 0} color="secondary" />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard icon={<VolunteerActivismIcon />} label="Total Donations" value={donationILS} color="success" />
      </Grid>
    </Grid>
  );
};

export default StatsCards;
