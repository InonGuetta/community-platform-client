import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import UsersTableContent from "./UsersTableContent";
import { useTranslation } from "react-i18next";

// Column headings, worded per language (users:headers.<key>).
const HEADERS = ["id", "name", "email", "role", "status", "actions"];

const UsersTable = ({ users, onEdit, onDelete, onToggleActive, canToggleActive = false, currentUserId, loading = false }) => {
  const { t } = useTranslation("users");
  return (
  <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
    {/* minWidth keeps the columns readable and lets TableContainer scroll the
        table horizontally on narrow screens instead of squashing the cells. */}
    <Table size="small" sx={{ minWidth: 640 }}>
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.100" }}>
          {HEADERS.map((h) => (
            <TableCell key={h} sx={{ fontWeight: 700 }}>{t(`headers.${h}`)}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <UsersTableContent
        users={users}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
        canToggleActive={canToggleActive}
        currentUserId={currentUserId}
        loading={loading}
      />
    </Table>
  </TableContainer>
  );
};

export default UsersTable;
