import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";
import ContentFieldsUpload from "./ContentFieldsUpload";
import { uploadMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPost";
import { updateMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPut";
import SuggestTagsDialog from "../TagPicker/SuggestTagsDialog";
import { closeUpload } from "../../../store/slicesAndThunks/uiSlice";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { fetchAllCourses } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceGet";
import { mediaApi } from "../../../api/mediaApi";
import { selectActiveCourses } from "../../../store/selectors/coursesSelectors";

// creatorName starts empty on purpose rather than pre-filled with "כללי": the
// placeholder says what blank will become, and pre-filling would make the
// default look like something the uploader chose.
const EMPTY_FIELDS = { title: "", description: "", mediaType: "video", courseId: "", creatorName: "", tags: [] };

const UploadMedia = ({ open }) => {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.ui.uploadProgress);
  const courses = useSelector(selectActiveCourses);
  // Derived from media already in the store — no request, and no new endpoint.
  // From the creators endpoint, not from the media in the store: the archive
  // filters server-side now, so the rows it holds are a filtered subset and the
  // suggestions would silently narrow to whatever the archive happened to be
  // showing when the dialog opened.
  const [knownCreators, setKnownCreators] = useState([]);
  // Fetched rather than derived: unlike creators, a tag can exist in the
  // vocabulary before any item the archive has loaded carries it.
  const [knownTags, setKnownTags] = useState([]);
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [uploading, setUploading] = useState(false);
  // The item that has just been stored, and what the server thinks it is about.
  // Held here rather than in the archive because this is the flow that produced
  // it: the upload succeeded, and the question that follows belongs to the same
  // gesture.
  const [justUploaded, setJustUploaded] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  // Only when the dialog opens: the archive page itself has no use for the
  // course list, and fetching on mount would pay for it on every visit.
  useEffect(() => {
    if (open) dispatch(fetchAllCourses());
  }, [open, dispatch]);

  // Only when the dialog opens, like the course list — and silent on failure:
  // an autocomplete with no suggestions still accepts a new tag, so a toast
  // would report a problem the user does not have.
  useEffect(() => {
    if (!open) return;
    mediaApi
      .creators()
      .then((rows) => setKnownCreators(rows.map((r) => r.name)))
      .catch(() => setKnownCreators([]));

    mediaApi
      .tags()
      // The tree as it comes. Flattening it into pickable options — with the
      // PATH that tells the two "שופטים" apart — belongs to the picker, which
      // is shared with the edit dialog.
      .then(setKnownTags)
      .catch(() => setKnownTags([]));
  }, [open]);

  const handleClose = () => dispatch(closeUpload());

  // Closing mid-upload used to unmount the dialog while the request was still
  // in flight, leaving the user with no idea whether it landed.
  const handleDialogClose = () => {
    if (uploading) return;
    handleClose();
  };

  const handleFieldChange = (key, val) => setFields((prev) => ({ ...prev, [key]: val }));

  const detectMediaType = (file) => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "text";
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setFields((prev) => ({ ...prev, mediaType: detectMediaType(selected) }));
  };

  const handleSubmit = async () => {
    if (!file || !fields.title || !fields.mediaType) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", fields.title);
    formData.append("description", fields.description);
    formData.append("mediaType", fields.mediaType);
    // Omitted entirely when no course is chosen: FormData stringifies, so an
    // empty selection would arrive as the string "" and fail optionalId.
    if (fields.courseId) formData.append("courseId", fields.courseId);
    // Sent only when the uploader typed something. Omitting the key is what lets
    // the server apply its own default, so blank here and absent here cannot
    // produce different rows.
    if (fields.creatorName.trim()) formData.append("creatorName", fields.creatorName.trim());
    // A picked tag is an OBJECT from the taxonomy and travels as its id; a typed
    // one is a plain STRING and travels as a name. The id is what disambiguates
    // the five names that occur in two branches — a name could not say which was
    // meant. Appended one at a time because multipart has no array type.
    fields.tags.forEach((tag) => {
      if (typeof tag === "string") formData.append("tags", tag);
      else formData.append("tagIds", tag.id);
    });
    const result = await dispatch(uploadMedia(formData));
    setUploading(false);

    // Keep the dialog — and the chosen file and typed title — on failure. The
    // toast says what went wrong; closing would make the user redo all of it.
    if (result.meta.requestStatus !== "fulfilled") return;

    const created = result.payload;
    setFile(null);
    setFields(EMPTY_FIELDS);
    handleClose();

    // Asked only of an item that arrived untagged. Somebody who already said what
    // it is about does not need to be asked again, and a dialog that opens after
    // every upload regardless is one people learn to dismiss without reading.
    if (!created?.id || fields.tags.length > 0) return;
    // Silent on failure: the item is stored and the tagging is an offer. An error
    // toast about a suggestion nobody asked for would report a problem the user
    // does not have.
    const offered = await mediaApi.tagSuggestions(created.id).catch(() => []);
    setSuggestions(offered);
    setJustUploaded(created);
  };

  const handleSkipTags = () => {
    setJustUploaded(null);
    setSuggestions([]);
  };

  const handleSaveTags = async (id, { tagIds, tags }) => {
    setSavingTags(true);
    const result = await dispatch(updateMedia({ id, tagIds, tags }));
    setSavingTags(false);
    dispatch(
      notify(
        result.meta.requestStatus === "fulfilled"
          ? { message: "התגיות נשמרו", severity: "success" }
          : { message: result.payload || "שמירת התגיות נכשלה", severity: "error" }
      )
    );
    if (result.meta.requestStatus === "fulfilled") handleSkipTags();
  };

  return (
    <>
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle onClose={handleClose}>העלאת מדיה</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              border: "2px dashed", borderColor: "grey.400", borderRadius: 2,
              p: 3, textAlign: "center", cursor: "pointer",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
            onClick={() => document.getElementById("media-file-input").click()}
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: "grey.500", mb: 1 }} />
            <Typography color="text.secondary">
              {file ? file.name : "לחץ לבחירת קובץ"}
            </Typography>
            <input
              id="media-file-input"
              type="file"
              hidden
              accept="video/*,audio/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileChange}
            />
          </Box>
          <ContentFieldsUpload
            values={fields}
            onChange={handleFieldChange}
            courses={courses}
            knownCreators={knownCreators}
            knownTags={knownTags}
          />

          {uploading && (
            <Box>
              <LinearProgress
                variant={progress > 0 ? "determinate" : "indeterminate"}
                value={progress}
                sx={{ borderRadius: 1, height: 8 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {progress > 0 && progress < 100
                  ? `מעלה... ${progress}%`
                  : "מעבד בשרת..."}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined" disabled={uploading}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={uploading || !file}>
          {uploading ? "מעלה..." : "העלאה"}
        </Button>
      </DialogActions>
    </Dialog>

      {/* Outside the upload dialog, and after it: the file is already stored, so
          this is a question rather than a step that can fail the upload. */}
      <SuggestTagsDialog
        open={Boolean(justUploaded)}
        item={justUploaded}
        suggestions={suggestions}
        nodes={knownTags}
        saving={savingTags}
        onSkip={handleSkipTags}
        onSave={handleSaveTags}
      />
    </>
  );
};

export default UploadMedia;
