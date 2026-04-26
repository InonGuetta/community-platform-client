import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import SearchBar from "../../../features/SearchBar/SearchBar";
import { mediaTypes } from "../../../../utilities/constant";

const FilterBar = ({ typeFilter, onFilter, onSearch }) => (
  <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
    <ToggleButtonGroup value={typeFilter} exclusive onChange={(_, v) => onFilter(v || "")} size="small">
      <ToggleButton value="">All</ToggleButton>
      {Object.values(mediaTypes).map((t) => (
        <ToggleButton key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</ToggleButton>
      ))}
    </ToggleButtonGroup>
    <SearchBar onSearch={onSearch} placeholder="Search media..." />
  </Box>
);

export default FilterBar;
