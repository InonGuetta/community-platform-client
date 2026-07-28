import { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

const SearchBar = ({ onSearch, placeholder = "חיפוש...", sx = {} }) => {
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
      sx={[{ minWidth: 280 }, sx]}
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
