import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import SearchBar from "../../../features/SearchBar/SearchBar";
import { mediaTypes, mediaTypeLabels } from "../../../../utilities/constant";

const FilterBar = ({ typeFilter, onFilter, onSearch }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
    <ToggleButtonGroup
      value={typeFilter}
      exclusive
      onChange={(_, v) => onFilter(v || "")}
      size="small"
      sx={(theme) => {
        const dark = theme.palette.mode === "dark";
        return {
          bgcolor: dark ? "rgba(255,255,255,0.06)" : "#e4e8ec",
          borderRadius: "12px",
          p: 0.5,
          gap: 0.5,
          "& .MuiToggleButton-root": {
            borderRadius: "9px !important",
            px: 2.25,
            py: 0.6,
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            border: "none !important",
            color: "text.secondary",
            "&.Mui-selected": {
              bgcolor: dark ? "rgba(255,255,255,0.16)" : "#ffffff",
              color: "primary.main",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.16)" : "#ffffff" },
            },
            "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.4)" },
          },
        };
      }}
    >
      <ToggleButton value="">הכל</ToggleButton>
      {Object.values(mediaTypes).map((t) => (
        <ToggleButton key={t} value={t}>{mediaTypeLabels[t]}</ToggleButton>
      ))}
    </ToggleButtonGroup>
    <SearchBar onSearch={onSearch} placeholder="חיפוש..."
      sx={(theme) => ({
        "& .MuiOutlinedInput-root": {
          borderRadius: "10px",
          // Light value preserved; dark uses a subtle overlay matching the
          // filter toggle group so the search box isn't a light island.
          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#eef1f3",
        },
        "& fieldset": { border: "none" },
      })}
    />
  </Box>
);

export default FilterBar;
