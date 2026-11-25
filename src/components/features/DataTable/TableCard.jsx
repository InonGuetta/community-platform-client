import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import { TABLE_SX } from "./tableSx";

// A table in its card (component 15): padding 12 / 16, and the table scrolls
// inside the card — never the page — when its columns are wider than a phone.
const TableCard = ({ children, minWidth = 560, label, sx = [], ...rest }) => (
  <Paper sx={[{ p: "12px 16px", overflowX: "auto" }, ...(Array.isArray(sx) ? sx : [sx])]} {...rest}>
    <Table size="small" aria-label={label} sx={[TABLE_SX, { minWidth }]}>
      {children}
    </Table>
  </Paper>
);

export default TableCard;
