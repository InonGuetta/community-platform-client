import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const ROLE_COLOR = { admin: "error", lecturer: "warning", student: "default" };

const UsersTableContent = ({ users, onEdit, onDelete }) => (
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id} hover sx={{ opacity: user.is_active ? 1 : 0.4 }}>
        <TableCell>{user.id}</TableCell>
        <TableCell>{user.display_name || "—"}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Chip label={user.role} color={ROLE_COLOR[user.role]} size="small" />
        </TableCell>
        <TableCell>
          <Chip label={user.is_active ? "Active" : "Inactive"} color={user.is_active ? "success" : "default"} size="small" />
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => onEdit(user)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => onDelete(user)}><DeleteIcon fontSize="small" /></IconButton>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
);

export default UsersTableContent;
