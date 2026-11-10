import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import FormatSizeIcon from "@mui/icons-material/FormatSize";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// The notebook's formatting strip. Sits at the top of the page, above the notes
// — and stays there while they scroll, which is what makes it usable on a column
// of a dozen notes rather than only on the one at the top.
//
// It holds NO state about the note. Every press is an `onCommand`, and which
// buttons look pressed comes in as `formats` — both from the page, which is also
// what the editors talk to. A toolbar that read the selection itself would be a
// second opinion about the same document, and the two would disagree the first
// time one of them missed an update.

// execCommand is deprecated and has no replacement: every alternative is either
// a rich-text library (a dependency, a data format, and a migration for the
// notes already written) or reimplementing selection surgery by hand. It is
// supported in every browser this app runs in. The editor is where that decision
// is enacted — see RichNoteEditor.exec — and this file only names the commands.
const TEXT_COLORS = [
  { label: "ברירת מחדל", value: "inherit", swatch: "currentColor" },
  { label: "אדום", value: "#d32f2f" },
  { label: "כתום", value: "#ed6c02" },
  { label: "ירוק", value: "#2e7d32" },
  { label: "כחול", value: "#1976d2" },
  { label: "סגול", value: "#7b1fa2" },
];

// Highlights are pale on purpose: the text has to stay readable through them,
// and in dark mode a saturated block behind dark glyphs is unreadable. The
// first entry removes the highlight rather than painting a white one over it.
const HIGHLIGHT_COLORS = [
  { label: "ללא הדגשה", value: "transparent", swatch: "transparent" },
  { label: "צהוב", value: "#fff59d" },
  { label: "ירוק", value: "#c8e6c9" },
  { label: "תכלת", value: "#b3e5fc" },
  { label: "ורוד", value: "#f8bbd0" },
  { label: "כתום", value: "#ffe0b2" },
];

// Sizes in real pixels, not in the seven buckets execCommand thinks in — see
// RichNoteEditor.setFontSize for how a pixel size is actually applied. The list
// is a set of shortcuts, not the range: any value between the bounds below can
// be typed into the field at the top of the menu.
const FONT_SIZE_PRESETS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72];

// What the browser renders unstyled text at, and therefore what the control
// shows before anything has been sized.
const DEFAULT_FONT_SIZE_PX = 16;

// Below the first, text is unreadable; above the last, one word fills the card.
// Enforced here rather than only in the field's `min`/`max`, which a typed value
// can sail straight past.
const MIN_FONT_SIZE_PX = 8;
const MAX_FONT_SIZE_PX = 200;

const clampFontSize = (value) =>
  Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, Math.round(value)));

const ColorMenu = ({ anchorEl, onClose, colors, onPick, title }) => (
  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
    <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, pb: 0.5, display: "block" }}>
      {title}
    </Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75, px: 1.25, pb: 1.25 }}>
      {colors.map((color) => (
        <Tooltip key={color.value} title={color.label}>
          {/* onMouseDown, not onClick: the press must be cancelled before the
              browser moves focus, or the selection in the editor is gone by the
              time the command runs. Same reason as the buttons below. */}
          <Box
            component="button"
            type="button"
            aria-label={color.label}
            onMouseDown={(e) => { e.preventDefault(); onPick(color.value); }}
            sx={{
              width: 34, height: 34, borderRadius: 1, cursor: "pointer",
              border: "1px solid", borderColor: "divider",
              bgcolor: color.swatch ?? color.value,
              // The "none" swatches are empty boxes, so they get the diagonal
              // stroke that means "nothing" everywhere else.
              backgroundImage: color.value === "transparent"
                ? "linear-gradient(45deg, transparent 45%, #d32f2f 45%, #d32f2f 55%, transparent 55%)"
                : "none",
            }}
          />
        </Tooltip>
      ))}
    </Box>
  </Menu>
);

// One button in the strip. At module level rather than inside NoteToolbar: a
// component declared during render is a NEW component type on every render, so
// React unmounts and remounts it — losing the tooltip's open state mid-hover.
const ToolButton = ({ title, active, disabled, onPress, children }) => (
  <Tooltip title={title}>
    {/* A disabled button fires none of the events Tooltip listens to, so it is
        wrapped — MUI warns about exactly this, and the span is the fix. */}
    <span>
      <IconButton
        disabled={disabled}
        aria-label={title}
        aria-pressed={Boolean(active)}
        onMouseDown={onPress}
        sx={{
          borderRadius: 1.5,
          color: active ? "primary.main" : "text.secondary",
          bgcolor: active ? "action.selected" : "transparent",
        }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

const NoteToolbar = ({ onCommand, onFontSize, formats = {}, disabled = false }) => {
  const [textColorAnchor, setTextColorAnchor] = useState(null);
  const [highlightAnchor, setHighlightAnchor] = useState(null);
  const [sizeAnchor, setSizeAnchor] = useState(null);
  // What is in the size FIELD, which is not the same as the size in the note:
  // "2" is a number on the way to being 24 and must not be applied as it is
  // typed. It is committed on Enter or on the apply button.
  const [typedSize, setTypedSize] = useState("");

  // A toolbar button must never take the focus. Clicking one collapses the
  // selection in the editor before the click handler ever runs, and the command
  // then applies to nothing — the single thing that makes a detached toolbar
  // like this one work at all.
  const press = (command, value) => (event) => {
    event.preventDefault();
    if (!disabled) onCommand(command, value);
  };

  // The three props every button in this strip shares, so each line below states
  // only what makes it different.
  const button = (title, command, active) => ({ title, active, disabled, onPress: press(command) });

  const currentSize = formats.fontSizePx || DEFAULT_FONT_SIZE_PX;

  const openSizeMenu = (event) => {
    // Seeded with the size the caret is standing in, so the field starts from
    // where the user is rather than from empty.
    setTypedSize(String(currentSize));
    setSizeAnchor(event.currentTarget);
  };

  const applySize = (px) => {
    setSizeAnchor(null);
    onFontSize(clampFontSize(px));
  };

  const applyTypedSize = () => {
    const px = Number(typedSize);
    if (Number.isFinite(px) && px > 0) applySize(px);
  };

  return (
    <Paper
      elevation={0}
      // role=toolbar so the strip is announced as one control group rather than
      // as a dozen loose buttons between a heading and a link.
      role="toolbar"
      aria-label="עיצוב ההערה"
      sx={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5,
        px: 1.5, py: 1, borderRadius: 2.5,
        border: "1px solid", borderColor: "divider",
        // Faded rather than hidden when there is nothing to format: the header
        // would otherwise change shape as the user moves between notes.
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* The size sits first and is the only control that shows a VALUE. It is
          the one whose current setting matters before you press it — everything
          else is a toggle you can see the result of. */}
      <Tooltip title="גודל הטקסט">
        <span>
          <Button
            disabled={disabled}
            aria-haspopup="menu"
            aria-label="גודל הטקסט"
            startIcon={<FormatSizeIcon />}
            endIcon={<ExpandMoreIcon />}
            // The menu opens on click; the rows and the field inside it are what
            // actually run the command.
            onClick={openSizeMenu}
            onMouseDown={(e) => e.preventDefault()}
            sx={{
              borderRadius: 1.5, color: "text.secondary", textTransform: "none",
              fontWeight: 700, minWidth: 118, justifyContent: "space-between",
            }}
          >
            {`${currentSize}px`}
          </Button>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />

      <ToolButton {...button("מודגש", "bold", formats.bold)}><FormatBoldIcon /></ToolButton>
      <ToolButton {...button("נטוי", "italic", formats.italic)}><FormatItalicIcon /></ToolButton>
      <ToolButton {...button("קו תחתון", "underline", formats.underline)}><FormatUnderlinedIcon /></ToolButton>
      <ToolButton {...button("קו חוצה", "strikeThrough", formats.strikeThrough)}><StrikethroughSIcon /></ToolButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />

      <Tooltip title="צבע טקסט">
        <span>
          <IconButton
            disabled={disabled}
            aria-label="צבע טקסט"
            aria-haspopup="menu"
            onClick={(e) => setTextColorAnchor(e.currentTarget)}
            onMouseDown={(e) => e.preventDefault()}
            sx={{ borderRadius: 1.5, color: "text.secondary" }}
          >
            <FormatColorTextIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="הדגשה">
        <span>
          <IconButton
            disabled={disabled}
            aria-label="הדגשה"
            aria-haspopup="menu"
            onClick={(e) => setHighlightAnchor(e.currentTarget)}
            onMouseDown={(e) => e.preventDefault()}
            sx={{ borderRadius: 1.5, color: formats.highlighted ? "primary.main" : "text.secondary" }}
          >
            <BorderColorIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />

      <ToolButton {...button("רשימת תבליטים", "insertUnorderedList", formats.unorderedList)}>
        <FormatListBulletedIcon />
      </ToolButton>
      <ToolButton {...button("רשימה ממוספרת", "insertOrderedList", formats.orderedList)}>
        <FormatListNumberedIcon />
      </ToolButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />

      <ToolButton {...button("ניקוי עיצוב", "removeFormat")}><FormatClearIcon /></ToolButton>

      <Menu
        anchorEl={sizeAnchor}
        open={Boolean(sizeAnchor)}
        onClose={() => setSizeAnchor(null)}
        // The list is long enough to run off a short window.
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        {/* Any size at all, typed. This is the one control in the toolbar that
            HAS to take the focus — you cannot type into a field without it —
            which is why the editor remembers the selection and restores it
            before applying (see RichNoteEditor). Everything else here cancels
            its own mousedown precisely to avoid needing that. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, pb: 1 }}>
          <TextField
            value={typedSize}
            onChange={(e) => setTypedSize(e.target.value)}
            // Both jobs in the CAPTURE phase, and they cannot be split.
            //
            // A menu moves focus to whichever ITEM matches what you type; inside
            // this field "24" is a size, not a jump to the row starting with 2,
            // so the keystrokes are stopped before they reach the menu. But
            // stopping propagation here also ends React's synthetic dispatch for
            // this event — a bubble-phase onKeyDown on the same element would
            // never run, which is precisely how Enter stopped working when the
            // two were written as separate handlers.
            onKeyDownCapture={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); applyTypedSize(); }
            }}
            type="number"
            size="small"
            autoFocus
            label="גודל בפיקסלים"
            inputProps={{ min: MIN_FONT_SIZE_PX, max: MAX_FONT_SIZE_PX, "aria-label": "גודל בפיקסלים" }}
            sx={{ width: 130 }}
          />
          <Button onClick={applyTypedSize} variant="contained" size="small" sx={{ borderRadius: 1.5 }}>
            החל
          </Button>
        </Box>

        {FONT_SIZE_PRESETS.map((px) => (
          <MenuItem
            key={px}
            selected={px === currentSize}
            onMouseDown={(e) => { e.preventDefault(); applySize(px); }}
            // MenuItem carries a physical `text-align: left` from MUI, and this
            // app runs RTL without the stylis flip plugin.
            sx={{ textAlign: "start", gap: 2, justifyContent: "space-between" }}
          >
            {/* Drawn at the size it sets, so the list SHOWS the sizes rather
                than describing them. Capped in the row so 72px does not make a
                menu item taller than the menu. */}
            <Typography sx={{ fontSize: Math.min(px, 34), lineHeight: 1.2 }}>אבג</Typography>
            <Typography variant="body2" color="text.secondary">{`${px}px`}</Typography>
          </MenuItem>
        ))}
      </Menu>

      <ColorMenu
        anchorEl={textColorAnchor}
        onClose={() => setTextColorAnchor(null)}
        colors={TEXT_COLORS}
        title="צבע הטקסט"
        onPick={(value) => { setTextColorAnchor(null); onCommand("foreColor", value); }}
      />
      <ColorMenu
        anchorEl={highlightAnchor}
        onClose={() => setHighlightAnchor(null)}
        colors={HIGHLIGHT_COLORS}
        title="צבע ההדגשה"
        onPick={(value) => { setHighlightAnchor(null); onCommand("hiliteColor", value); }}
      />
    </Paper>
  );
};

export default NoteToolbar;
