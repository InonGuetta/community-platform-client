import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import StatsCards from "./componentsAdmin/StatsCards";
import QueueStatus from "./componentsAdmin/QueueStatus";
import SystemHealth from "./componentsAdmin/SystemHealth";
import PipelineTrouble from "./componentsAdmin/PipelineTrouble";
import DonationsLedger from "./componentsAdmin/DonationsLedger";
import TagProposals from "./componentsAdmin/TagProposals";
import AiUsagePanel from "./componentsAdmin/AiUsagePanel";
import { useAdminDashboardController } from "./useAdminDashboardController";

// Layout only: what the dashboard loads, when, and the reconcile sweep are
// useAdminDashboardController's.
const AdminDashboard = () => {
  const {
    stats, queueStatus, health, trouble, donations, loading, error, handleReconcile,
  } = useAdminDashboardController();

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

        {/* What OpenAI has cost this month, against the cap (ADM-1, NFR-3). Its
            own load, outside the 30s refresh — see useAiUsage. */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <AiUsagePanel />
          </Paper>
        </Grid>

        {/* Its own load, outside the 30s refresh: a decision is made by the
            admin on this screen, and the list refreshes after each one. */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <TagProposals />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <PipelineTrouble trouble={trouble} onReconciled={handleReconcile} />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <DonationsLedger donations={donations?.donations ?? []} totals={donations?.totals ?? []} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
