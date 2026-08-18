import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";
import { SOURCE_STYLES } from "../../../../utilities/noteFootnotes";

// The last question before a document is written: what to do with the lectures
// its notes cite.
//
// It is a step of its own rather than another row in the export menu, and that
// is the whole point of the file. The menu had grown to three dividers and
// seven rows — a wall to read through before the one thing anybody opened it
// for — while this question is not a setting to browse past but a decision with
// three real answers, asked once, at the moment it matters.
//
// It comes AFTER the format and after the notes have been arranged, because by
// then everything else is settled and this is all that is left. One click on a
// row both answers it and writes the file: the user has already said what to
// export and in what shape, and making them choose and then confirm would be a
// second click that adds nothing.

const CHOICES = [
  {
    style: SOURCE_STYLES.footnotes,
    icon: <VerticalAlignBottomIcon />,
    title: "מקורות בתחתית העמוד",
    detail: "מספר קטן בתוך הטקסט, והמקור המלא נדפס בתחתית העמוד שבו הוא מופיע",
  },
  {
    style: SOURCE_STYLES.inline,
    icon: <FormatQuoteIcon />,
    title: "מקורות בתוך הטקסט",
    detail: "כל מקור ממוספר ונשאר במקומו, עם התוכן כפי שהוא מופיע בכרטיסייה",
  },
  {
    style: SOURCE_STYLES.none,
    icon: <NotInterestedIcon />,
    title: "ייצוא ללא מקורות כלל",
    detail: "רק הכתיבה שלך, בלי ההפניות לשיעורים",
  },
];

const ExportSourcesDialog = ({ open, current, summary, exporting, onChoose, onClose }) => (
  <Dialog open={open} onClose={exporting ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle onClose={exporting ? undefined : onClose}>איך לכלול את המקורות?</DialogTitle>

    <DialogContent>
      {/* What is about to be written, so the choice is made against something
          concrete rather than in the abstract. */}
      {summary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {summary}
        </Typography>
      )}

      <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {CHOICES.map(({ style, icon, title, detail }) => (
          <ListItemButton
            key={style}
            // Guarded here as well as by `disabled`. A ListItemButton is a div,
            // not a native button, so `disabled` only paints it grey and sets
            // pointer-events: none — which stops a mouse and nothing else. A
            // second answer arriving mid-write would start a second export of
            // the same notes.
            onClick={() => { if (!exporting) onChoose(style); }}
            disabled={exporting}
            // The last choice is remembered and shown as selected, because
            // most people export the same way every time — but it is not
            // pre-applied, so the question is still asked.
            selected={current === style}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: current === style ? "primary.main" : "divider",
              alignItems: "flex-start",
              gap: 1,
              py: 1.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, color: current === style ? "primary.main" : "text.secondary", mt: 0.25 }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={title}
              secondary={detail}
              primaryTypographyProps={{ fontWeight: 700 }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItemButton>
        ))}
      </List>

      {exporting && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="caption" color="text.secondary">מייצא...</Typography>
        </Box>
      )}
    </DialogContent>

    <DialogActions>
      <Button onClick={onClose} variant="outlined" disabled={exporting}>ביטול</Button>
    </DialogActions>
  </Dialog>
);

export default ExportSourcesDialog;
