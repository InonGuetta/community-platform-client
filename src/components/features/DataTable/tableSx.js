// The table of Redesign v4 (component 15), as the `sx` of a MUI <Table>: column
// headings in the kicker style and mute, every body row under a `line` border,
// padding 16, 15px. The card around it is `TableCard`'s.
export const TABLE_SX = {
  "& .MuiTableCell-root": {
    borderBottom: 0,
    paddingBlock: "16px",
    paddingInline: "12px",
    fontSize: 15,
    textAlign: "start",
  },
  "& .MuiTableHead-root .MuiTableCell-root": {
    paddingBlock: "8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "text.secondary",
    whiteSpace: "nowrap",
  },
  "& .MuiTableBody-root .MuiTableRow-root": {
    borderTop: 1,
    borderColor: "divider",
  },
  "& .MuiTableBody-root .MuiTableRow-root:hover": { backgroundColor: "transparent" },
};

// A cell that holds a number or an amount, at the end of the row.
export const END_CELL_SX = { textAlign: "end" };
