import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import UsersTableContent from "./UsersTableContent";

const HEADERS = ["ID / מזהה", "שם", "אימייל", "תפקיד", "סטטוס", "פעולות"];

const UsersTable = ({ users, onEdit, onDelete, onToggleActive, canToggleActive = false, currentUserId, loading = false }) => (
  <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
    {/* minWidth keeps the columns readable and lets TableContainer scroll the
        table horizontally on narrow screens instead of squashing the cells. */}
    <Table size="small" sx={{ minWidth: 640 }}>
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.100" }}>
          {HEADERS.map((h) => (
            <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
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

export default UsersTable;
