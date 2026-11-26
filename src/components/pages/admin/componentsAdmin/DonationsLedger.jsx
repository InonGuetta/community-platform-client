import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import SegmentedControl from "../../../features/SegmentedControl/SegmentedControl";
import { TABLE_SX } from "../../../features/DataTable/tableSx";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useTranslation } from "react-i18next";
import { formatShortDate } from "../../../../utilities/formatDate";

// Who gave what, which an admin could not see at all.
//
// The stats cards report a single completed TOTAL — a number with nothing behind
// it, that cannot be checked against Stripe and says nothing about what failed or
// is stuck pending. For an organisation taking donations that is the one thing
// the figure has to be good for.
const CURRENCY_SYMBOLS = { ILS: "₪", USD: "$", EUR: "€" };

const money = (cents, currency) =>
  `${CURRENCY_SYMBOLS[String(currency).toUpperCase()] ?? ""}${(cents / 100).toFixed(2)}`;

const STATUS_TONES = { completed: "success", pending: "warning", failed: "error" };
const STATUSES = Object.keys(STATUS_TONES);

const DonationsLedger = ({ donations, totals }) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  const { t } = useTranslation("admin");
  const [filter, setFilter] = useState("");

  const rows = filter ? donations.filter((d) => d.status === filter) : donations;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700}>{t("donations.title")}</Typography>
        <SegmentedControl
          size="small"
          label={t("donations.title")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "", label: t("donations.all") },
            ...STATUSES.map((status) => ({ value: status, label: t(`donations.statuses.${status}`) })),
          ]}
        />
      </Box>

      {/* The totals come from a GROUP BY over the whole table, not from summing
          the bounded list below — which would quietly under-report the moment
          there are more donations than the query's limit. */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {(totals ?? []).map((total) => (
          <StatusBadge key={total.status} tone={STATUS_TONES[total.status] ?? "neutral"}>
            {`${t(`donations.statuses.${total.status}`, { defaultValue: total.status })}: ${money(total.total_cents, "ILS")} (${total.count})`}
          </StatusBadge>
        ))}
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t("donations.none")}</Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={TABLE_SX}>
            <TableHead>
              <TableRow>
                <TableCell>{t("donations.date")}</TableCell>
                <TableCell>{t("donations.donor")}</TableCell>
                <TableCell>{t("donations.amount")}</TableCell>
                <TableCell>{t("donations.type")}</TableCell>
                <TableCell>{t("donations.status")}</TableCell>
                {/* The Stripe reference is what makes this reconcilable — it is
                    the id to paste into their dashboard. */}
                <TableCell>{t("donations.stripeRef")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatShortDate(donation.created_at)}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                    {donation.donor_name || donation.donor_email || "—"}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {money(donation.amount_cents, donation.currency)}
                  </TableCell>
                  <TableCell>{donation.type === "monthly" ? t("donations.monthly") : t("donations.oneTime")}</TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONES[donation.status] ?? "neutral"} size="small">
                      {t(`donations.statuses.${donation.status}`, { defaultValue: donation.status })}
                    </StatusBadge>
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
