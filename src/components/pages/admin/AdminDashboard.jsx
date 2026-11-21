import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import PageHeader from "../../features/PageHeader/PageHeader";
import StatsCards from "./componentsAdmin/StatsCards";
import QueueStatus from "./componentsAdmin/QueueStatus";
import SystemHealth from "./componentsAdmin/SystemHealth";
import PipelineTrouble from "./componentsAdmin/PipelineTrouble";
import DonationsLedger from "./componentsAdmin/DonationsLedger";
import TagProposals from "./componentsAdmin/TagProposals";
import AiUsagePanel from "./componentsAdmin/AiUsagePanel";
import SmsUsagePanel from "./componentsAdmin/SmsUsagePanel";
import { useAdminDashboardController } from "./useAdminDashboardController";
import { RADIUS } from "../../../theme/tokens";
import { useTranslation } from "react-i18next";

// A section is a card; "מצב תורים" and "תקינות המערכת" are sub-cards on fill-2
// (component 17).
const CARD_SX = { bgcolor: "background.paper", borderRadius: `${RADIUS.card}px`, boxShadow: 1, border: 1, borderColor: "divider", p: 3, minWidth: 0 };
const SUB_CARD_SX = { ...CARD_SX, bgcolor: "surface.fill2", boxShadow: 0 };
const FULL = { gridColumn: { md: "1 / -1" } };

// Layout only: what the dashboard loads, when, and the reconcile sweep are
// useAdminDashboardController's.
const AdminDashboard = () => {
  const { t } = useTranslation("admin");
  const {
    stats, queueStatus, health, trouble, donations, loading, error, handleReconcile,
  } = useAdminDashboardController();

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader title={t("title")} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("stale", { error })}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <StatsCards stats={stats} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(12, minmax(0, 1fr))" }, gap: 3 }}>
        <Box sx={{ ...SUB_CARD_SX, gridColumn: { md: "span 7" } }}>
          <QueueStatus queueStatus={queueStatus} />
        </Box>
        <Box sx={{ ...SUB_CARD_SX, gridColumn: { md: "span 5" } }}>
          <SystemHealth health={health} />
        </Box>

        {/* What OpenAI has cost this month, against the cap (ADM-1, NFR-3). Its
            own load, outside the 30s refresh — see useAiUsage. */}
        <Box sx={{ ...CARD_SX, ...FULL }}>
          <AiUsagePanel />
        </Box>

        {/* And SMS — codes and notifications — against its own cap (AUTH-13). */}
        <Box sx={{ ...CARD_SX, ...FULL }}>
          <SmsUsagePanel />
        </Box>

        {/* Its own load, outside the 30s refresh: a decision is made by the
            admin on this screen, and the list refreshes after each one. */}
        <Box sx={{ ...CARD_SX, ...FULL }}>
          <TagProposals />
        </Box>

        <Box sx={{ ...CARD_SX, ...FULL }}>
          <PipelineTrouble trouble={trouble} onReconciled={handleReconcile} />
        </Box>

        <Box sx={{ ...CARD_SX, ...FULL }}>
          <DonationsLedger donations={donations?.donations ?? []} totals={donations?.totals ?? []} />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
