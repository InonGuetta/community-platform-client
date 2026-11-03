import { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

// `label` names the field for a screen reader — a placeholder is not a name, and
// vanishes once something is typed. It defaults to the placeholder without its
// trailing dots, which is what each caller's placeholder already says.
//
// No fixed minimum width on a phone: 280px beside a heading and a button pushed
// the users page 150px past a 375px screen (PRD MOB-7 review).
const SearchBar = ({ onSearch, placeholder = "חיפוש...", label, sx = {} }) => {
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
      sx={[{ minWidth: { xs: 0, sm: 280 } }, sx]}
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
