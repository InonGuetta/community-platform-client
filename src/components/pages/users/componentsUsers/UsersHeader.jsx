import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/PersonAdd";
import SearchBar from "../../../features/SearchBar/SearchBar";

const UsersHeader = ({ onSearch, onCreateClick }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
    <Typography variant="h5" fontWeight={700}>ניהול משתמשים</Typography>
    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
      <SearchBar onSearch={onSearch} placeholder="חיפוש משתמשים..." />
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateClick}>הוספת משתמש</Button>
    </Box>
  </Box>
);

export default UsersHeader;
