import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableCard from "../../../features/DataTable/TableCard";
import UsersTableContent from "./UsersTableContent";
import { useTranslation } from "react-i18next";

// Column headings, worded per language (users:headers.<key>).
const HEADERS = ["id", "name", "email", "role", "status", "actions"];

const UsersTable = ({ users, onEdit, onDelete, onToggleActive, canToggleActive = false, currentUserId, loading = false }) => {
  const { t } = useTranslation("users");
  return (
    // minWidth keeps the columns readable; the card scrolls the table
    // sideways on a phone, so the page itself never does.
    <TableCard minWidth={720}>
      <TableHead>
        <TableRow>
          {HEADERS.map((h) => (
            <TableCell key={h}>{t(`headers.${h}`)}</TableCell>
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
    </TableCard>
  );
};

export default UsersTable;
