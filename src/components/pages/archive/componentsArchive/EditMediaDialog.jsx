import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";
import ContentFieldsUpload from "../../../features/UploadMedia/ContentFieldsUpload";
import { fieldsFromItem } from "../../../features/UploadMedia/lessonFields";

// Editing a lesson's details after the upload: title, description, the name it
// is credited to, and the course it is filed in.
//
// The server has accepted every one of these on PUT /media/update/:id all
// along; the archive only ever sent the publish toggle and the tags. So a typo
// in a lecturer's name, made once in a hurry, stayed on the card, in the filter
// and in the search for good — and every later upload autocompleted from it.
//
// The fields are the upload form's own component, so the two forms cannot drift
// apart: the same autocomplete over the known names, the same length cap, the
// same "blank becomes כללי". What is sent is decided by the controller — only the
// fields that changed; see editChanges.
//
// Mounted per item by the caller (a `key`), which is what seeds the fields from
// the lesson. An effect that copied the item into state on open would be one
// more place where the two can disagree for a render.

const EMPTY = [];

const EditMediaDialog = ({ item, courses = EMPTY, knownCreators = EMPTY, onClose, onSave }) => {
  const [fields, setFields] = useState(() => fieldsFromItem(item));
  const [saving, setSaving] = useState(false);

  // The course the lesson is in now, even when the editor may not file into it
  // — an admin moved it, or the course's lecturer changed. Left out of the list,
  // the select would show an empty field for a lesson that is in a course, and
  // the editor would read that as "not in any course".
  const courseOptions = useMemo(() => {
    const current = item.course_id;
    if (!current || courses.some((c) => Number(c.id) === Number(current))) return courses;
    return [...courses, { id: current, title: item.course_title || "הקורס הנוכחי" }];
  }, [courses, item.course_id, item.course_title]);

  const handleFieldChange = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(item, fields);
    setSaving(false);
  };

  // Closing mid-save would leave the user not knowing whether it landed — the
  // same reason the upload dialog refuses to close while uploading.
  const handleClose = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog open onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle onClose={handleClose}>עריכת פרטים — {item.title}</DialogTitle>
      <DialogContent>
        <ContentFieldsUpload
          values={fields}
          onChange={handleFieldChange}
          courses={courseOptions}
          knownCreators={knownCreators}
          editing
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined" disabled={saving}>ביטול</Button>
        {/* The server refuses an empty title; disabling says so before the
            round trip rather than after it. */}
        <Button onClick={handleSave} variant="contained" disabled={saving || !fields.title.trim()}>
          {saving ? "שומר..." : "שמירה"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMediaDialog;
