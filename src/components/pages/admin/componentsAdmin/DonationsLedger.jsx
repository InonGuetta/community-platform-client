import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

// Who gave what, which an admin could not see at all.
//
// The stats cards report a single completed TOTAL — a number with nothing behind
// it, that cannot be checked against Stripe and says nothing about what failed or
// is stuck pending. For an organisation taking donations that is the one thing
// the figure has to be good for.
const CURRENCY_SYMBOLS = { ILS: "₪", USD: "$", EUR: "€" };

const money = (cents, currency) =>
  `${CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? ""}${(cents / 100).toFixed(2)}`;

const STATUS_LABELS = { completed: "הושלם", pending: "ממתין", failed: "נכשל" };
const STATUS_COLORS = { completed: "success", pending: "warning", failed: "error" };

const DonationsLedger = ({ donations, totals }) => {
  const [filter, setFilter] = useState("");

  const rows = filter ? donations.filter((d) => d.status === filter) : donations;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700}>תרומות</Typography>
        <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => setFilter(v ?? "")}>
          <ToggleButton value="">הכול</ToggleButton>
          {Object.keys(STATUS_LABELS).map((status) => (
            <ToggleButton key={status} value={status}>{STATUS_LABELS[status]}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* The totals come from a GROUP BY over the whole table, not from summing
          the bounded list below — which would quietly under-report the moment
          there are more donations than the query's limit. */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {(totals ?? []).map((total) => (
          <Chip
            key={total.status}
            color={STATUS_COLORS[total.status] ?? "default"}
            variant="outlined"
            label={`${STATUS_LABELS[total.status] ?? total.status}: ${money(total.total_cents, "ILS")} (${total.count})`}
          />
        ))}
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">אין תרומות להצגה.</Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>תאריך</TableCell>
                <TableCell>תורם</TableCell>
                <TableCell>סכום</TableCell>
                <TableCell>סוג</TableCell>
                <TableCell>מצב</TableCell>
                {/* The Stripe reference is what makes this reconcilable — it is
                    the id to paste into their dashboard. */}
                <TableCell>אסמכתא Stripe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {new Date(donation.created_at).toLocaleDateString("he-IL")}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                    {donation.donor_name || donation.donor_email || "—"}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {money(donation.amount_cents, donation.currency)}
                  </TableCell>
                  <TableCell>{donation.type === "monthly" ? "חודשי" : "חד פעמי"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={STATUS_COLORS[donation.status] ?? "default"}
                      label={STATUS_LABELS[donation.status] ?? donation.status}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", direction: "ltr", unicodeBidi: "isolate" }}>
                    {donation.stripe_payment_intent || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default DonationsLedger;
