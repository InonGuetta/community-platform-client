import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import UsersTableContent from "./UsersTableContent";

const HEADERS = ["ID", "Name", "Email", "Role", "Status", "Actions"];

const UsersTable = ({ users, onEdit, onDelete }) => (
  <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.100" }}>
          {HEADERS.map((h) => (
            <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <UsersTableContent users={users} onEdit={onEdit} onDelete={onDelete} />
    </Table>
  </TableContainer>
);

export default UsersTable;
