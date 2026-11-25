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
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import PageHeader from "../../../features/PageHeader/PageHeader";
import { useTranslation } from "react-i18next";

// The notebook's header (Redesign v4, screen 05): the page title, and at its
// end "new note" (primary) and the export menu (soft). The formatting strip
// that used to sit between them is now at the top of the notes column — see
// NotebookPage. Layout only — every value and handler is
// useNotebookPageController's, handed down by NotebookPage.
const NotebookHeader = ({
  askSources,
  exportAnchor,
  exporting,
  handleCreate,
  notesToExport,
  selectedCount,
  setExportAnchor,
  setSplitOpen,
}) => {
  const { t } = useTranslation("notebook");
  return (
    <PageHeader
      title={t("title")}
      actions={
        <>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            {t("newNote")}
          </Button>

          {/* Export sits next to "new note" rather than down in the list with
              the tick boxes: it acts on the notebook, like the button beside
              it, and the two formats are a choice worth showing by name. */}
          <Tooltip title={selectedCount > 0 ? t("export.selectedTooltip", { count: selectedCount }) : t("export.allTooltip")}>
            <span>
              <Button
                variant="soft"
                startIcon={exporting ? <CircularProgress size={18} /> : <FileDownloadOutlinedIcon />}
                onClick={(e) => setExportAnchor(e.currentTarget)}
                disabled={exporting || notesToExport.length === 0}
                aria-haspopup="menu"
              >
                {t("export.button")}
              </Button>
            </span>
          </Tooltip>

          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
            {/* Named so the user knows what is about to be written before it
                is written — the count, and which of the two documents it will
                be. */}
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
              {selectedCount > 0 ? t("export.selectedCount", { count: selectedCount }) : t("export.allCount", { count: notesToExport.length })}
            </Typography>

            {/* Three rows and nothing else. What happens to the SOURCES is
                asked after one of them is pressed — see ExportSourcesDialog —
                because it is a decision with three real answers rather than a
                setting to read past on the way to the button everybody came
                for. */}
            <MenuItem onClick={() => askSources({ format: "pdf" })} sx={{ textAlign: "start" }}>
              <ListItemIcon><PictureAsPdfOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t("export.pdf")} secondary={t("export.pdfHint")} />
            </MenuItem>
            <MenuItem onClick={() => askSources({ format: "word" })} sx={{ textAlign: "start" }}>
              <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t("export.word")} secondary={t("export.wordHint")} />
            </MenuItem>

            {/* Offered only when there is something to divide. An array rather
                than a fragment: MUI walks a Menu's children to drive keyboard
                navigation, and a fragment hides them from it. */}
            {notesToExport.length >= 2 && [
              <Divider key="split-divider" />,
              <MenuItem key="split" onClick={() => { setExportAnchor(null); setSplitOpen(true); }} sx={{ textAlign: "start" }}>
                <ListItemIcon><CallSplitIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={t("export.split")} secondary={t("export.splitHint")} />
              </MenuItem>,
            ]}
          </Menu>
        </>
      }
    />
  );
};

export default NotebookHeader;
