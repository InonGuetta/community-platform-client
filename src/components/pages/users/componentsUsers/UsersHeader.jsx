import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/PersonAdd";
import PageHeader from "../../../features/PageHeader/PageHeader";
import SearchBar from "../../../features/SearchBar/SearchBar";
import { useTranslation } from "react-i18next";

const UsersHeader = ({ onSearch, onCreateClick }) => {
  const { t } = useTranslation("users");
  return (
    <PageHeader
      title={t("title")}
      actions={
        // Wraps on a phone: search on one line, "add" under it.
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <SearchBar onSearch={onSearch} placeholder={t("search")} sx={{ flex: 1, minWidth: 200 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateClick}>{t("add")}</Button>
        </Box>
      }
    />
  );
};

export default UsersHeader;
