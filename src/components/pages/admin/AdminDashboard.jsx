import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import StatsCards from "./componentsAdmin/StatsCards";
import QueueStatus from "./componentsAdmin/QueueStatus";
import SystemHealth from "./componentsAdmin/SystemHealth";
import axiosInstance from "../../../utilities/axiosInstance";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, q, h] = await Promise.all([
          axiosInstance.get("/admin/stats"),
          axiosInstance.get("/admin/queue-status"),
          axiosInstance.get("/admin/system-health"),
        ]);
        setStats(s.data);
        setQueueStatus(q.data);
        setHealth(h.data);
      } catch {}
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
      <Typography variant="h5" fontWeight={700} mb={3}>Admin Dashboard</Typography>

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
