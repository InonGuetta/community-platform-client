import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import { mediaTypes, mediaTypeLabels } from "../../../utilities/constant";

// `courses` may be empty — no courses defined yet, or a student somehow reaching
// this — in which case the field is hidden rather than shown with one useless
// option. An unassigned upload is a valid outcome: it lands in the general
// library, which is where everything predating courses already sits.
const ContentFieldsUpload = ({ values, onChange, courses = [] }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <TextField
      label="כותרת"
      value={values.title}
      onChange={(e) => onChange("title", e.target.value)}
      required
      fullWidth
    />
    <TextField
      label="תיאור"
      value={values.description}
      onChange={(e) => onChange("description", e.target.value)}
      multiline
      rows={3}
      fullWidth
    />
    <TextField
      label="סוג מדיה"
      value={values.mediaType}
      onChange={(e) => onChange("mediaType", e.target.value)}
      select
      fullWidth
      required
    >
      {Object.values(mediaTypes).map((type) => (
        <MenuItem key={type} value={type}>{mediaTypeLabels[type] || type}</MenuItem>
      ))}
    </TextField>
    {courses.length > 0 && (
      <TextField
        label="שיוך לקורס"
        value={values.courseId}
        onChange={(e) => onChange("courseId", e.target.value)}
        select
        fullWidth
        helperText="ללא קורס — התוכן מוצג לכל התלמידים"
      >
        <MenuItem value="">ללא קורס (ספרייה כללית)</MenuItem>
        {courses.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>
        ))}
      </TextField>
    )}
  </Box>
);

export default ContentFieldsUpload;
