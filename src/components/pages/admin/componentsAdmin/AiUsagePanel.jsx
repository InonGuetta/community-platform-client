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
import useAiUsage from "./useAiUsage";
import { purposeLabel, formatUsd, formatUsage, capProgress } from "./aiUsageFormat";
import { useTranslation } from "react-i18next";
import { formatNumber } from "../../../../utilities/formatDate";

// "עלות AI החודש" (PRD ADM-1, NFR-3): what OpenAI has cost this month, against
// the cap, and what it was spent on. An estimate — the usage OpenAI reported,
// at list price — and said so, because the invoice is the real number.
const AiUsagePanel = () => {
  const { t } = useTranslation("admin");
  const { report, status, reload } = useAiUsage();

  if (status === "loading" && !report) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={28} /></Box>;
  }
  if (status === "failed" && !report) {
    return <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>{t("ai.retry")}</Button>}>{t("ai.loadFailed")}</Alert>;
  }

  const progress = capProgress(report.spentUsd, report.capUsd);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700}>{t("ai.title")}</Typography>
        <Button size="small" onClick={reload} disabled={status === "loading"}>{t("ai.refresh")}</Button>
      </Box>

      <Box>
        <Typography variant="h4" fontWeight={800} component="p">{formatUsd(report.spentUsd)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t("ai.estimate")}
        </Typography>
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
          {progress.percent >= 100 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t("ai.capReached")}
            </Alert>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("ai.noCap")}
        </Typography>
      )}

      {report.byPurpose.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t("ai.unused")}</Typography>
      ) : (
        <Table size="small" aria-label={t("ai.tableLabel")}>
          <TableHead>
            <TableRow>
              <TableCell>{t("ai.kind")}</TableCell>
              <TableCell>{t("ai.usage")}</TableCell>
              <TableCell sx={{ textAlign: "end" }}>{t("ai.calls")}</TableCell>
              <TableCell sx={{ textAlign: "end" }}>{t("ai.cost")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.byPurpose.map((row) => (
              <TableRow key={row.purpose}>
                <TableCell>{purposeLabel(row.purpose)}</TableCell>
                <TableCell>{formatUsage(row)}</TableCell>
                <TableCell sx={{ textAlign: "end" }}>{formatNumber(row.calls)}</TableCell>
                <TableCell sx={{ textAlign: "end" }}>{formatUsd(row.cost_usd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default AiUsagePanel;
