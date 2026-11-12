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
import SuggestTagsDialog from "../TagPicker/SuggestTagsDialog";
import { useUploadMedia } from "./useUploadMedia";

// Layout only: what the dialog loads, sends and asks afterwards is useUploadMedia's.
const UploadMedia = ({ open }) => {
  const {
    progress, courses, knownCreators, knownTags, file, fields, uploading,
    justUploaded, suggestions, savingTags,
    handleClose, handleDialogClose, handleFieldChange, handleFileChange, handleSubmit,
    handleSkipTags, handleSaveTags,
  } = useUploadMedia({ open });

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
