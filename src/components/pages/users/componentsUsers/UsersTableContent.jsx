import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import { roleLabels } from "../../../../utilities/constant";

const ROLE_COLOR = { admin: "error", lecturer: "warning", student: "default" };

const SKELETON_ROWS = 5;
const SKELETON_COLS = 6;

const UsersTableContent = ({ users, onEdit, onDelete, onToggleActive, canToggleActive = false, currentUserId, loading = false }) => (
  <TableBody>
    {loading && users.length === 0 ? (
      Array.from({ length: SKELETON_ROWS }).map((_, r) => (
        <TableRow key={`skeleton-${r}`}>
          {Array.from({ length: SKELETON_COLS }).map((__, c) => (
            <TableCell key={c}><Skeleton /></TableCell>
          ))}
        </TableRow>
      ))
    ) : (
    users.map((user) => (
      <TableRow key={user.id} hover sx={{ opacity: user.is_active ? 1 : 0.4 }}>
        <TableCell>{user.id}</TableCell>
        <TableCell>{user.display_name || "—"}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Chip label={roleLabels[user.role] || user.role} color={ROLE_COLOR[user.role]} size="small" />
        </TableCell>
        <TableCell>
          <Chip label={user.is_active ? "פעיל" : "לא פעיל"} color={user.is_active ? "success" : "default"} size="small" />
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => onEdit(user)}><EditIcon fontSize="small" /></IconButton>
          {/* Admin-only active toggle. Disabled on your own row so an admin can't
              lock themselves out by deactivating their own account. */}
          {canToggleActive && (
            <Tooltip title={user.id === currentUserId ? "לא ניתן לשנות סטטוס של עצמך" : (user.is_active ? "העברה למצב לא פעיל" : "הפעלת משתמש")}>
              <span>
                <IconButton
                  size="small"
                  color={user.is_active ? "success" : "default"}
                  disabled={user.id === currentUserId}
                  onClick={() => onToggleActive(user)}
                >
                  {user.is_active ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          <IconButton size="small" color="error" onClick={() => onDelete(user)}><DeleteIcon fontSize="small" /></IconButton>
        </TableCell>
      </TableRow>
    )))}
  </TableBody>
);

export default UsersTableContent;
