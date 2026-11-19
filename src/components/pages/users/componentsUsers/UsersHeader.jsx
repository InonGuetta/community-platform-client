import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/PersonAdd";
import SearchBar from "../../../features/SearchBar/SearchBar";
import { useTranslation } from "react-i18next";

const UsersHeader = ({ onSearch, onCreateClick }) => {
  const { t } = useTranslation("users");
  return (
  // Wraps on a phone: the heading on one line, search and "add" on the next.
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
    <Typography variant="h5" fontWeight={700}>{t("title")}</Typography>
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", flex: { xs: "1 1 100%", sm: "0 1 auto" } }}>
      <SearchBar onSearch={onSearch} placeholder={t("search")} sx={{ flex: 1 }} />
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateClick}>{t("add")}</Button>
    </Box>
  </Box>
  );
};

export default UsersHeader;
