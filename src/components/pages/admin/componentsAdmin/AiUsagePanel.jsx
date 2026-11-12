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

// "עלות AI החודש" (PRD ADM-1, NFR-3): what OpenAI has cost this month, against
// the cap, and what it was spent on. An estimate — the usage OpenAI reported,
// at list price — and said so, because the invoice is the real number.
const AiUsagePanel = () => {
  const { report, status, reload } = useAiUsage();

  if (status === "loading" && !report) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={28} /></Box>;
  }
  if (status === "failed" && !report) {
    return <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>נסה שוב</Button>}>לא ניתן לטעון את נתוני העלות.</Alert>;
  }

  const progress = capProgress(report.spentUsd, report.capUsd);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700}>עלות AI החודש</Typography>
        <Button size="small" onClick={reload} disabled={status === "loading"}>רענון</Button>
      </Box>

      <Box>
        <Typography variant="h4" fontWeight={800} component="p">{formatUsd(report.spentUsd)}</Typography>
        <Typography variant="caption" color="text.secondary">
          הערכה לפי השימוש שדיווח OpenAI ומחירון רשמי. החשבונית היא המספר הסופי.
        </Typography>
      </Box>

      {progress ? (
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress.percent}
            color={progress.severity}
            sx={{ height: 8, borderRadius: 4 }}
            aria-label={`${Math.round(progress.percent)}% מהתקרה החודשית`}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {`מתוך תקרה של ${formatUsd(report.capUsd)} · ${Math.round(progress.percent)}%`}
          </Typography>
          {progress.percent >= 100 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              התקרה החודשית הושגה. עיבוד חדש (תמלול, סיכום, תיקון עברית, כותרות) חסום עד החודש הבא. הצ׳אט ממשיך לעבוד.
            </Alert>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          לא הוגדרה תקרה חודשית. אפשר להגדיר אותה במשתנה AI_MONTHLY_CAP_USD בקובץ ‎.env של השרת.
        </Typography>
      )}

      {report.byPurpose.length === 0 ? (
        <Typography variant="body2" color="text.secondary">החודש עוד לא היה שימוש ב‑AI.</Typography>
      ) : (
        <Table size="small" aria-label="עלות לפי סוג">
          <TableHead>
            <TableRow>
              <TableCell>סוג</TableCell>
              <TableCell>שימוש</TableCell>
              <TableCell align="left">קריאות</TableCell>
              <TableCell align="left">עלות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.byPurpose.map((row) => (
              <TableRow key={row.purpose}>
                <TableCell>{purposeLabel(row.purpose)}</TableCell>
                <TableCell>{formatUsage(row)}</TableCell>
                <TableCell align="left">{row.calls.toLocaleString("he-IL")}</TableCell>
                <TableCell align="left">{formatUsd(row.cost_usd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default AiUsagePanel;
