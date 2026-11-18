import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import useSmsUsage from "./useSmsUsage";
import { formatUsd, capProgress } from "./aiUsageFormat";
import { categoryLabel } from "../../../../utilities/notificationCategories";
import { formatNumber } from "../../../../utilities/formatDate";
import { useTranslation } from "react-i18next";

// "עלות SMS החודש" (PRD AUTH-13): verification codes and notifications sent by
// SMS this month, against SMS_MONTHLY_CAP_USD. An estimate — segments at the
// configured price — and said so. Without a provider every message went to the
// server's log, and the panel says that first.
const SmsUsagePanel = () => {
  const { t } = useTranslation("admin");
  const { report, status, reload } = useSmsUsage();

  if (status === "loading" && !report) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={28} /></Box>;
  }
  if (status === "failed" && !report) {
    return <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>{t("ai.retry")}</Button>}>{t("sms.loadFailed")}</Alert>;
  }

  const progress = capProgress(report.spentUsd, report.capUsd);
  const purpose = (key) => (key === "verification" ? t("sms.verification") : categoryLabel(key));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700}>{t("sms.title")}</Typography>
        <Button size="small" onClick={reload} disabled={status === "loading"}>{t("ai.refresh")}</Button>
      </Box>

      {!report.configured && <Alert severity="info">{t("sms.notConfigured")}</Alert>}

      <Box>
        <Typography variant="h4" fontWeight={800} component="p">{formatUsd(report.spentUsd)}</Typography>
        <Typography variant="caption" color="text.secondary">{t("sms.estimate")}</Typography>
      </Box>

      {progress ? (
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress.percent}
            color={progress.severity}
            sx={{ height: 8, borderRadius: 4 }}
            aria-label={t("ai.ofCapLabel", { percent: Math.round(progress.percent) })}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {t("ai.ofCap", { cap: formatUsd(report.capUsd), percent: Math.round(progress.percent) })}
          </Typography>
          {progress.percent >= 100 && <Alert severity="error" sx={{ mt: 1 }}>{t("sms.capReached")}</Alert>}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">{t("sms.noCap")}</Typography>
      )}

      {report.byPurpose.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t("sms.unused")}</Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" aria-label={t("sms.tableLabel")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("ai.kind")}</TableCell>
                <TableCell sx={{ textAlign: "end" }}>{t("sms.messages")}</TableCell>
                <TableCell sx={{ textAlign: "end" }}>{t("sms.segments")}</TableCell>
                <TableCell sx={{ textAlign: "end" }}>{t("sms.failed")}</TableCell>
                <TableCell sx={{ textAlign: "end" }}>{t("ai.cost")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.byPurpose.map((row) => (
                <TableRow key={row.purpose}>
                  <TableCell>{purpose(row.purpose)}</TableCell>
                  <TableCell sx={{ textAlign: "end" }}>{formatNumber(row.messages)}</TableCell>
                  <TableCell sx={{ textAlign: "end" }}>{formatNumber(row.segments)}</TableCell>
                  <TableCell sx={{ textAlign: "end" }}>{formatNumber(row.failed)}</TableCell>
                  <TableCell sx={{ textAlign: "end" }}>{formatUsd(row.cost_usd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default SmsUsagePanel;
