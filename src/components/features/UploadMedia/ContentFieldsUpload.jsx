import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TagPicker from "../TagPicker/TagPicker";
import {
  mediaTypes,
  mediaTypeLabels,
  creatorLabels,
  defaultCreatorName,
  creatorNameMaxLength,
  MAX_TAGS,
} from "../../../utilities/constant";

// `courses` may be empty — no courses defined yet, or a student somehow reaching
// this — in which case the field is hidden rather than shown with one useless
// option. An unassigned upload is a valid outcome: it lands in the general
// library, which is where everything predating courses already sits.
// `knownCreators` is the DISTINCT set of names already in the archive, derived
// by the caller from the media it has already loaded — no new endpoint.
//
// It is freeSolo, so it never blocks a name that has not been used before; what
// it prevents is the same person being entered as "הרב כהן", "הרב  כהן" and
// "רב כהן" within a week, which no amount of server-side cleaning can undo
// afterwards and which quietly breaks the filter and the per-lecturer page.
const ContentFieldsUpload = ({ values, onChange, courses = [], knownCreators = [], knownTags = [] }) => (
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
    {/* Attribution. The label follows the media type — a lecture has a מרצה, a
        book has a מחבר — and both write the same column. Optional by design:
        left blank, the server stores "כללי", which is also what every item
        uploaded before this field existed now reads. */}
    <Autocomplete
      freeSolo
      options={knownCreators}
      value={values.creatorName}
      onChange={(_, next) => onChange("creatorName", next ?? "")}
      onInputChange={(_, next) => onChange("creatorName", next)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={creatorLabels[values.mediaType] || creatorLabels.video}
          placeholder={defaultCreatorName}
          helperText={`אם יישאר ריק יירשם "${defaultCreatorName}"`}
          slotProps={{ htmlInput: { ...params.inputProps, maxLength: creatorNameMaxLength } }}
          fullWidth
        />
      )}
    />
    {/* Tags: what KIND of content this is. Free text with autocomplete over the
        taxonomy — nobody can write the right vocabulary up front, and a wrong
        one pushes people to file things under the nearest wrong heading. These
        are what the archive filter and the search read.

        The picker is shared with the edit dialog: the two must offer the same
        vocabulary and the same cap, or an item edited in one could not be
        reproduced in the other. */}
    <TagPicker
      nodes={knownTags}
      value={values.tags}
      onChange={(next) => onChange("tags", next)}
      // Optional, and said out loud rather than enforced. Blocking the upload on
      // it was tried and taken back out: somebody uploading a shiur they have
      // just recorded does not always know where it belongs, and a form that
      // will not submit until they decide is a form they abandon. The archive
      // still needs the tag, so it is asked for again — with suggestions — once
      // the file is safely stored.
      helperText={`עד ${MAX_TAGS} תגיות. אפשר גם לדלג — נציע תגיות אחרי ההעלאה.`}
    />

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
