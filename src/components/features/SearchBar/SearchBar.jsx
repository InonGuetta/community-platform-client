import { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import { RADIUS } from "../../../theme/tokens";

// `label` names the field for a screen reader — a placeholder is not a name, and
// vanishes once something is typed. It defaults to the placeholder without its
// trailing dots, which is what each caller's placeholder already says.
//
// No fixed minimum width on a phone: 280px beside a heading and a button pushed
// the users page 150px past a 375px screen (PRD MOB-7 review).
//
// Redesign v4, component 8 (D-29 — this is the search field, not a second
// one): a grey pill 40 high, the magnifier 14px in from the start, and on
// focus a white body with a 2px accent ring instead of the form field's 4px
// halo.
const SearchBar = ({ onSearch, placeholder: given, label, sx = {} }) => {
  const { t } = useTranslation();
  const placeholder = given ?? t("search.placeholder");
  const [value, setValue] = useState("");

  const handleChange = (e) => {
    setValue(e.target.value);
    onSearch(e.target.value);
  };

  // Array form so callers can pass a function sx (mode-aware colors), not only an
  // object. Object sx still works — it's just the second entry in the array.
  return (
    <TextField
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      size="small"
      sx={[
        (theme) => ({
          minWidth: { xs: 0, sm: 280 },
          "& .MuiOutlinedInput-root": {
            borderRadius: `${RADIUS.pill}px`,
            bgcolor: "surface.fill",
            "&.Mui-focused": { bgcolor: "background.paper", boxShadow: `0 0 0 2px ${theme.palette.primary.main}` },
          },
          "& .MuiInputAdornment-root": { color: "text.secondary" },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      inputProps={{ "aria-label": label || placeholder.replace(/(\.{3}|…)$/, "") }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
    />
  );
};

export default SearchBar;
