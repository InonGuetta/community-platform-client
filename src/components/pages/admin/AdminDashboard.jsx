import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import StatsCards from "./componentsAdmin/StatsCards";
import QueueStatus from "./componentsAdmin/QueueStatus";
import SystemHealth from "./componentsAdmin/SystemHealth";
import { adminApi } from "../../../api/adminApi";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Renamed on the way out so they do not shadow the state variables of
        // the same name declared above.
        const { stats: nextStats, queueStatus: nextQueue, health: nextHealth } =
          await adminApi.overview();
        setStats(nextStats);
        setQueueStatus(nextQueue);
        setHealth(nextHealth);
        setError(null);
      } catch (err) {
        // This used to be swallowed entirely, which was worse than it sounds:
        // with no data, the health panel renders "לא זמין" for both Postgres
        // and Redis — so a request that merely failed looks exactly like an
        // outage, and sends an admin off investigating a database that is fine.
        setError(err.response?.data?.message || "לא ניתן לטעון את נתוני הניהול");
      }
      setLoading(false);
    };
    load();

    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>לוח בקרה ניהולי</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error} — הנתונים המוצגים עשויים להיות לא מעודכנים.
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <StatsCards stats={stats} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <QueueStatus queueStatus={queueStatus} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <SystemHealth health={health} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
