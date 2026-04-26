import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import { mediaTypes } from "../../../utilities/constant";

const ContentFieldsUpload = ({ values, onChange }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <TextField
      label="Title"
      value={values.title}
      onChange={(e) => onChange("title", e.target.value)}
      required
      fullWidth
    />
    <TextField
      label="Description"
      value={values.description}
      onChange={(e) => onChange("description", e.target.value)}
      multiline
      rows={3}
      fullWidth
    />
    <TextField
      label="Media Type"
      value={values.mediaType}
      onChange={(e) => onChange("mediaType", e.target.value)}
      select
      fullWidth
      required
    >
      {Object.values(mediaTypes).map((type) => (
        <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>
      ))}
    </TextField>
  </Box>
);

export default ContentFieldsUpload;
