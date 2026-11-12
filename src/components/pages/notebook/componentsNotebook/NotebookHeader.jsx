import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import AddIcon from "@mui/icons-material/Add";
import IosShareIcon from "@mui/icons-material/IosShare";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import NoteToolbar from "../../../features/Notes/NoteToolbar";

// The notebook's header: the title, the formatting strip for the note being
// edited, the export menu and "new note". Layout only — every value and
// handler is useNotebookPageController's, handed down by NotebookPage.
const NotebookHeader = ({
  activeNoteId,
  askSources,
  editorApis,
  exportAnchor,
  exporting,
  formats,
  handleCreate,
  notesToExport,
  selectedCount,
  setExportAnchor,
  setSplitOpen,
}) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", flexShrink: 0 }}>
    <Typography variant="h4" fontWeight={800} color="primary">המחברת שלי</Typography>

    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", minWidth: 300 }}>
      <NoteToolbar
        onCommand={(command, value) => editorApis.current.get(activeNoteId)?.exec(command, value)}
        // A pixel size is not an execCommand — see RichNoteEditor.setFontSize
        // — so it has its own way in rather than a fake command name.
        onFontSize={(px) => editorApis.current.get(activeNoteId)?.setFontSize(px)}
        formats={formats}
        // Nothing to format until the caret is in one of the cards. The
        // strip stays in place and fades, so the header does not change
        // shape as the user moves between notes.
        disabled={!activeNoteId}
      />
    </Box>

    {/* Export sits next to "new note" rather than down in the list with the
        tick boxes: it acts on the notebook, like the button beside it, and
        the two formats are a choice worth showing by name. */}
    <Tooltip title={selectedCount > 0 ? `ייצוא ${selectedCount} ההערות שנבחרו` : "ייצוא כל ההערות המוצגות"}>
      <span>
        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={18} /> : <IosShareIcon />}
          onClick={(e) => setExportAnchor(e.currentTarget)}
          disabled={exporting || notesToExport.length === 0}
          aria-haspopup="menu"
          sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
        >
          ייצוא
        </Button>
      </span>
    </Tooltip>

    <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
      {/* Named so the user knows what is about to be written before it is
          written — the count, and which of the two documents it will be. */}
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
        {selectedCount > 0 ? `${selectedCount} הערות שנבחרו` : `כל ההערות המוצגות (${notesToExport.length})`}
      </Typography>

      {/* Three rows and nothing else. What happens to the SOURCES is asked
          after one of them is pressed — see ExportSourcesDialog — because
          it is a decision with three real answers rather than a setting to
          read past on the way to the button everybody came for. */}
      <MenuItem onClick={() => askSources({ format: "pdf" })} sx={{ textAlign: "start" }}>
        <ListItemIcon><PictureAsPdfOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary="ייצוא ל-PDF" secondary="טקסט בלבד, ללא עיצוב ותמונות" />
      </MenuItem>
      <MenuItem onClick={() => askSources({ format: "word" })} sx={{ textAlign: "start" }}>
        <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary="ייצוא ל-Word" secondary="עם העיצוב והתמונות" />
      </MenuItem>

      {/* Offered only when there is something to divide. An array rather
          than a fragment: MUI walks a Menu's children to drive keyboard
          navigation, and a fragment hides them from it. */}
      {notesToExport.length >= 2 && [
        <Divider key="split-divider" />,
        <MenuItem key="split" onClick={() => { setExportAnchor(null); setSplitOpen(true); }} sx={{ textAlign: "start" }}>
          <ListItemIcon><CallSplitIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="פיצול למספר מחברות…" secondary="לבחור כמה קבצים, ומה נכנס לכל אחד" />
        </MenuItem>,
      ]}
    </Menu>

    <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}
      sx={{
        background: "linear-gradient(135deg, #29b6d8 0%, #1597bb 100%)",
        "&:hover": { background: "linear-gradient(135deg, #1ea7ca 0%, #128aab 100%)" },
        borderRadius: 2, fontWeight: 700, px: 3, boxShadow: "0 3px 10px rgba(21,151,187,0.35)",
      }}
    >
      הערה חדשה
    </Button>
  </Box>
);

export default NotebookHeader;
