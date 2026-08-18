import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import { sanitizeNoteHtml, isNoteHtmlEmpty } from "../../../../utilities/noteHtml";
import { mediaTypeAccents } from "../../../../utilities/constant";
import { sourceChipHtml, sourceFromChip, SOURCE_CHIP_SELECTOR } from "../../../../utilities/noteSource";

// The note body, as a contentEditable rather than a TextField — which is the
// whole reason the toolbar can do anything. A textarea holds characters; bold is
// not a character, and neither is a pasted screenshot.
//
// Three facts govern everything below:
//
//   * The DOM, not React, owns the text while the user is typing. Re-rendering a
//     contentEditable from a state string resets the caret to the start on every
//     keystroke, so `html` is written into the element ONLY when it differs from
//     what is already there — which is true when a different note is opened, and
//     false for the echo of the user's own typing.
//   * The toolbar lives elsewhere on the page and must not take the focus. It
//     calls in through the imperative handle below, and its buttons cancel their
//     own mousedown so the selection is still there when the command runs.
//   * Some controls cannot avoid taking the focus — you cannot type a number
//     into a field without focusing it. So the selection is also REMEMBERED, and
//     restored before any command runs. That is what lets the size box accept a
//     typed value and still apply it to the words the user had selected.

// A pasted image is stored inside the note itself, as a data: URL, rather than
// uploaded and linked. Two reasons, and the second is the important one: the
// notes API takes a body and nothing else, so linking would mean an upload
// endpoint, a place to put the file and a rule for deleting it — and a note that
// points at a file is a note that can break, while a note that CONTAINS its
// picture cannot. The cost is size, which is what the cap below is for.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// Which of the toolbar's buttons should look pressed, read off the live
// selection. Reported upward rather than kept here: the toolbar is not inside
// this component.
const readFormats = () => {
  const highlight = document.queryCommandValue("hiliteColor") || document.queryCommandValue("backColor");
  return {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    strikeThrough: document.queryCommandState("strikeThrough"),
    unorderedList: document.queryCommandState("insertUnorderedList"),
    orderedList: document.queryCommandState("insertOrderedList"),
    // An unhighlighted selection reports its background as transparent, which is
    // a value — checking for "a value at all" would light the button up on every
    // note.
    highlighted: Boolean(highlight) && !/transparent|rgba\(0,\s*0,\s*0,\s*0\)/i.test(highlight),
    fontSizePx: readFontSizePx(),
  };
};

// The size under the caret, in real pixels.
//
// NOT queryCommandValue("fontSize"): that reports the 1–7 bucket the ancient
// command works in, which is the very scale the toolbar stopped speaking. The
// computed style is what is actually on screen, whoever set it and however.
const readFontSizePx = () => {
  const selection = document.getSelection();
  let node = selection?.anchorNode;
  if (!node) return null;
  if (node.nodeType === 3) node = node.parentElement;
  if (!node?.nodeType) return null;
  const size = parseFloat(getComputedStyle(node).fontSize);
  return Number.isFinite(size) ? Math.round(size) : null;
};

// Where in the document a point is, as a collapsed range — for a bookmark
// dropped into the middle of a paragraph, which has to land under the pointer
// rather than at the end of the note.
//
// Two spellings of the same thing, and no browser has both: caretRangeFromPoint
// is WebKit and Blink, caretPositionFromPoint is the standard one Firefox
// implements. Anything with neither (jsdom, for one) gets null, and the caller
// falls back to the caret's last known home.
const caretRangeAt = (x, y) => {
  if (typeof document.caretRangeFromPoint === "function") {
    return document.caretRangeFromPoint(x, y);
  }
  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }
  return null;
};

const RichNoteEditor = forwardRef(({ html, onChange, onFormatsChange, onFocus, onError, onOpenSource, placeholder }, ref) => {
  const editorRef = useRef(null);
  // The editor and the image controls that float over it. Their positions are
  // measured against this, so it is the element they are both inside.
  const frameRef = useRef(null);
  // The last selection that was inside THIS editor. See the third note above.
  const savedRange = useRef(null);

  // The object the pointer is on, and where it sits inside the frame — the
  // outline and the delete button are drawn from this.
  //
  // "Object" is either of the two things in a note body that are not text: a
  // pasted picture, or a source chip. Both have the same problem — they cannot
  // be removed by typing, and selecting one exactly with a mouse is fiddly — so
  // both get the same answer, and the only difference between them is the word
  // in the tooltip.
  //
  // Measured into state rather than done in CSS because of the button. A
  // :hover rule can outline something, but the control that removes it cannot
  // live INSIDE the contentEditable — anything in there is part of the note,
  // gets saved with it, and can be typed into. So it is a sibling, positioned
  // over the object, which means somebody has to know where the object is.
  const [framed, setFramed] = useState(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== html) editor.innerHTML = html;
  }, [html]);

  const rememberSelection = useCallback(() => {
    const selection = document.getSelection();
    if (!selection?.rangeCount) return;
    if (!editorRef.current?.contains(selection.anchorNode)) return;
    savedRange.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const reportFormats = useCallback(() => {
    rememberSelection();
    onFormatsChange?.(readFormats());
  }, [onFormatsChange, rememberSelection]);

  // Raw innerHTML, deliberately NOT sanitized here. Sanitizing on every
  // keystroke would rewrite the element whenever the pass changed anything, and
  // rewriting it mid-word puts the caret back at the start. The markup is
  // cleaned at the two boundaries where it can actually arrive from outside —
  // paste, below, and load, in noteBodyToHtml — which is where an allowlist
  // belongs anyway.
  const emitChange = () => onChange(editorRef.current?.innerHTML ?? "");

  // Measure an object so the outline and the X can be drawn over it. Called on
  // hover and again whenever the box could have moved under a pointer that has
  // not left it — scrolling the editor, most of all.
  const frameObject = useCallback((element, kind) => {
    const frame = frameRef.current;
    const editor = editorRef.current;
    if (!frame || !editor || !element?.isConnected) {
      setFramed(null);
      return;
    }

    const box = element.getBoundingClientRect();
    const origin = frame.getBoundingClientRect();
    const view = editor.getBoundingClientRect();

    // Clipped to the part of the object that is actually ON SCREEN.
    //
    // The editor scrolls inside itself but these controls are drawn outside it,
    // so nothing clips them: an image scrolled half past the top gave a
    // negative offset, and the outline and the X were painted over the card's
    // own title. Cropping to the intersection keeps both inside the box they
    // describe, and the button lands on the visible top edge rather than on an
    // edge that has scrolled away.
    //
    // Only when there is something to crop AGAINST. An unlaid-out editor
    // measures as a zero-height box at the origin, and cropping to that would
    // hide every control in the note rather than position it — so an
    // unmeasurable viewport means "no clipping information", not "nothing is
    // visible".
    const measurable = view.height > 0 && box.height > 0;
    const top = measurable ? Math.max(box.top, view.top) : box.top;
    const bottom = measurable ? Math.min(box.bottom, view.bottom) : box.bottom;

    // Scrolled out of sight, or down to a sliver too small to aim at.
    if (measurable && bottom - top < 12) {
      setFramed(null);
      return;
    }

    setFramed({
      element,
      kind,
      top: top - origin.top,
      left: box.left - origin.left,
      width: box.width,
      height: bottom - top,
    });
  }, []);

  // What the pointer is over, if it is over something removable. A chip is
  // asked about via closest() because the pointer lands on the text node inside
  // it, not on the span.
  const removableAt = (target) => {
    if (target?.tagName === "IMG") return { element: target, kind: "image" };
    const chip = target?.closest?.(SOURCE_CHIP_SELECTOR);
    return chip ? { element: chip, kind: "source" } : null;
  };

  // Removing a pasted screenshot or a source chip, neither of which had an
  // answer before this beyond selecting it exactly and pressing Delete — and an
  // image on its own line, or a one-word chip mid-sentence, is surprisingly
  // hard to select exactly.
  //
  // No confirmation: this is an edit like any other, it is undone by not saving
  // the note, and a dialog in front of every deleted picture would make
  // arranging a page of them unbearable.
  const removeFramed = () => {
    framed?.element.remove();
    setFramed(null);
    emitChange();
    editorRef.current?.focus();
  };

  const FRAMED_LABEL = { image: "מחיקת התמונה", source: "מחיקת המקור" };

  // Put the caret back where it was before running a command. Three cases, in
  // order: the selection is still in the editor and nothing needs doing; there
  // is a remembered one to restore; or this editor has never been in — in which
  // case a command should start writing at the end rather than silently do
  // nothing.
  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (selection && editor?.contains(selection.anchorNode)) return;

    editor?.focus();
    const range = savedRange.current ?? document.createRange();
    if (!savedRange.current) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  // Put the caret where the pointer let go, so a dropped bookmark lands in the
  // sentence it was aimed at. A point outside this editor — a drop on the
  // card's margin, or a browser that cannot answer the question — falls back to
  // the caret's last position, which is still a deliberate place rather than a
  // guess.
  const placeCaretAt = (point) => {
    const editor = editorRef.current;
    editor?.focus();

    const range = point ? caretRangeAt(point.x, point.y) : null;
    if (!range || !editor?.contains(range.startContainer)) {
      restoreSelection();
      return;
    }
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  useImperativeHandle(ref, () => ({
    exec(command, value) {
      if (!editorRef.current) return;
      restoreSelection();

      // Colours as CSS on a span rather than as <font> tags. Without this,
      // browsers still emit <font color>, which is both dead markup and a second
      // shape for the sanitizer and the styling to handle.
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(command, false, value);

      emitChange();
      reportFormats();
    },

    // Font size in pixels, which execCommand cannot do.
    //
    // `fontSize` accepts 1–7 and nothing else — it predates CSS and there is no
    // version of it that takes a length. So the browser is asked for the size it
    // uses LEAST often, 7, purely as a marker: with styleWithCSS off it wraps
    // the selection in <font size="7"> elements, and those are then rewritten to
    // spans carrying the pixel size that was actually wanted. Handing the
    // selection surgery to the browser is the entire point — walking a range
    // across partially-selected nodes by hand is how rich text editors become
    // libraries.
    setFontSize(px) {
      const editor = editorRef.current;
      if (!editor) return;
      restoreSelection();

      const selection = document.getSelection();
      const wasCollapsed = selection?.isCollapsed;

      document.execCommand("styleWithCSS", false, false);
      document.execCommand("fontSize", false, "7");

      let lastSpan = null;
      for (const font of [...editor.querySelectorAll('font[size="7"]')]) {
        const span = document.createElement("span");
        span.style.fontSize = `${px}px`;
        // A caret with nothing selected produces an EMPTY marker. An empty span
        // is dropped by the browser and gives the caret nowhere to live, so it
        // gets a zero-width space to hold it open until something is typed —
        // which is why noteHtmlToPlainText strips those characters back out.
        if (font.childNodes.length === 0) span.appendChild(document.createTextNode("\u200B"));
        else span.append(...font.childNodes);
        font.replaceWith(span);
        lastSpan = span;
      }

      // Typing continues at the new size rather than after it.
      if (wasCollapsed && lastSpan && selection) {
        const range = document.createRange();
        range.selectNodeContents(lastSpan);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      emitChange();
      reportFormats();
    },

    // A bookmark dropped into the note, written in as a source chip — see
    // utilities/noteSource.js for what that is and why it is a span rather than
    // a link. `point` is where the pointer let go, in client coordinates.
    //
    // insertHTML rather than DOM surgery for the same reason setFontSize leans
    // on execCommand: it splits whatever node the caret is standing in and
    // leaves the undo stack intact, and doing that by hand is how an editor
    // starts becoming a library.
    insertSource(bookmark, point) {
      if (!editorRef.current || !bookmark?.mediaId) return;
      placeCaretAt(point);
      document.execCommand("insertHTML", false, sourceChipHtml(bookmark));
      emitChange();
      reportFormats();
    },
  }));

  const insertImage = (file) => {
    if (file.size > MAX_IMAGE_BYTES) {
      onError?.(`התמונה גדולה מדי (מעל ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB). נסה תמונה קטנה יותר.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // The read is asynchronous, so by now the selection may have moved. It was
      // remembered before the read started, and restoring it is what puts the
      // picture where the user pasted rather than wherever the caret drifted to.
      restoreSelection();
      document.execCommand("insertHTML", false, `<img src="${reader.result}" alt="">`);
      emitChange();
    };
    reader.onerror = () => onError?.("קריאת התמונה נכשלה.");
    reader.readAsDataURL(file);
  };

  // Two kinds of paste, and they are not the same event.
  //
  // An IMAGE — a screenshot, a copied picture — arrives as a file on the
  // clipboard and is embedded. Anything else is taken as plain TEXT: a note is
  // often filled from a transcript or a web page, and carrying that source's
  // markup in would import fonts, sizes and colours the notebook never chose,
  // most of which the sanitizer would strip back out again anyway.
  const handlePaste = (event) => {
    const images = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));

    if (images.length > 0) {
      event.preventDefault();
      rememberSelection();
      for (const file of images) insertImage(file);
      return;
    }

    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  };

  const showPlaceholder = isNoteHtmlEmpty(html);

  return (
    <Box
      ref={frameRef}
      sx={{ position: "relative", flexGrow: 1, display: "flex" }}
      // On the FRAME, not on the editor: the delete button is outside the
      // editable box, so a mouse travelling from the picture to the X leaves
      // the editor — and clearing on the editor's own mouseleave would take the
      // button away a pixel before it could be pressed.
      onMouseLeave={() => setFramed(null)}
    >
      <Box
        ref={editorRef}
        component="div"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="גוף ההערה"
        onInput={() => {
          emitChange();
          // Typing moves everything below the caret, so a frame measured a
          // moment ago is now drawn somewhere the object no longer is.
          if (framed) setFramed(null);
        }}
        onBlur={() => {
          rememberSelection();
          onChange(sanitizeNoteHtml(editorRef.current?.innerHTML ?? ""));
        }}
        onPaste={handlePaste}
        onKeyUp={reportFormats}
        onMouseUp={reportFormats}
        // A source chip opens the lecture it names. The chip is
        // contenteditable="false", so this click never had a caret to place and
        // there is nothing to take away from the user by handling it.
        onClick={(event) => {
          const source = sourceFromChip(event.target);
          if (source) onOpenSource?.(source);
        }}
        onMouseOver={(event) => {
          const found = removableAt(event.target);
          if (found) frameObject(found.element, found.kind);
          else if (framed) setFramed(null);
        }}
        // The editor scrolls inside itself, so the object moves while the
        // pointer does not. Re-measured rather than hidden: a frame that
        // disappears when you scroll a long note is a frame you cannot use.
        onScroll={() => { if (framed) frameObject(framed.element, framed.kind); }}
        // Focus does two things: it reports the formats under the caret, and it
        // tells the page which of its stacked editors the toolbar now drives.
        onFocus={() => { onFocus?.(); reportFormats(); }}
        sx={{
          flexGrow: 1, width: "100%", minHeight: 280,
          p: 2, borderRadius: 1, overflowY: "auto",
          border: "1px solid", borderColor: "divider",
          outline: "none", lineHeight: 1.7,
          "&:hover": { borderColor: "text.primary" },
          // The brand ring the rest of the app uses on a focused control, as a
          // literal rather than currentColor — which is the TEXT colour here and
          // would draw a black halo round the box.
          "&:focus": { borderColor: "primary.main", boxShadow: "0 0 0 3px rgba(21,151,187,0.15)" },
          // A list indents on the side the text starts from. Without this the
          // bullets sit on the left of a right-to-left line, detached from it.
          "& ul, & ol": { paddingInlineStart: "1.5rem", margin: "0.5rem 0" },
          // A pasted screenshot is whatever size it was taken at, which is
          // routinely wider than this box. Scaled down to fit rather than
          // allowed to force the whole page sideways.
          "& img": { maxWidth: "100%", height: "auto", borderRadius: 4, display: "block", my: 1 },
          // A source chip — a bookmark dragged in from the sidebar. Styled from
          // here rather than with inline CSS on the element itself so it follows
          // the theme into dark mode, and so the sanitizer has one less kind of
          // style attribute to have an opinion about.
          "& span[data-media-id]": {
            display: "inline-block",
            px: 0.75,
            py: 0.25,
            mx: 0.25,
            borderRadius: 1.5,
            // The neutral case: a chip carrying no media type, which is every
            // chip written before the type was recorded. The three real colours
            // are below.
            bgcolor: "primary.main",
            color: "#fff",
            fontSize: "0.8em",
            fontWeight: 700,
            lineHeight: 1.45,
            verticalAlign: "middle",
            cursor: "pointer",
            userSelect: "none",
            // An inline-block cannot break itself, so without these two a
            // lecture with a long name produced a chip wider than the editor
            // and the note ran off the side of its own card. maxWidth pins it
            // to the column; overflowWrap lets the label wrap inside the chip
            // instead of pushing its edge outwards — and it stays ONE box, so
            // the outline drawn round it on hover is still a rectangle.
            maxWidth: "100%",
            overflowWrap: "anywhere",
            // Darkened rather than switched to a named "dark" shade: the three
            // accents are fixed hex values with no dark variant of their own.
            "&:hover": { filter: "brightness(0.88)" },
          },

          // A source keeps the colour of the KIND of lecture it came from —
          // orange for video, blue for audio, green for text — which is the
          // same accent the archive's cards and the sidebar's own bookmark
          // headers use. Dragging a bookmark out of an orange group and having
          // it land as a blue chip made the two into different things; they are
          // the same thing in two places.
          '& span[data-media-id][data-media-type="video"]': { bgcolor: mediaTypeAccents.video },
          '& span[data-media-id][data-media-type="audio"]': { bgcolor: mediaTypeAccents.audio },
          '& span[data-media-id][data-media-type="text"]': { bgcolor: mediaTypeAccents.text },

          // The chip's second line: what the user wrote at that second. Lighter
          // and slightly smaller than the lecture's name above it, because the
          // name is the address and this is the content.
          '& span[data-media-id] span[data-chip-line="note"]': {
            display: "block",
            fontSize: "0.95em",
            fontWeight: 500,
            opacity: 0.95,
          },
        }}
      />

      {/* The object under the pointer — a picture or a source chip: an outline
          saying which one is meant, and the one control it needs. Both are
          OUTSIDE the contentEditable — anything inside it would be part of the
          note, would be saved with it, and could be typed into. */}
      {framed?.element.isConnected && (
        <>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              // Held a little off the object so the outline reads as being
              // AROUND it rather than as a border someone added to it — which
              // matters most for a chip, which already has a filled background
              // of its own.
              top: framed.top - 2,
              // Physical left, not insetInlineStart: the number came out of
              // getBoundingClientRect, which is physical — and the page is
              // right-to-left, so a logical property would mirror it onto the
              // wrong side of the note.
              left: framed.left - 2,
              width: framed.width + 4,
              height: framed.height + 4,
              border: "2px solid",
              borderColor: "primary.main",
              borderRadius: "6px",
              pointerEvents: "none",
            }}
          />
          <Tooltip title={FRAMED_LABEL[framed.kind]}>
            <IconButton
              size="small"
              onClick={removeFramed}
              aria-label={FRAMED_LABEL[framed.kind]}
              sx={{
                position: "absolute",
                // The object's top-right corner, which is where the note's own
                // text begins in a right-to-left notebook — so the button sits
                // at its start, not trailing off its end.
                top: framed.top,
                left: framed.left + framed.width,
                transform: "translate(-50%, -50%)",
                bgcolor: "error.main",
                color: "#fff",
                boxShadow: 2,
                // A chip is barely taller than its own text, so a button sized
                // for a screenshot would bury it. Both sizes still clear the
                // 24px the corner needs to stay pressable.
                p: framed.kind === "source" ? 0 : 0.25,
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <CloseIcon sx={{ fontSize: framed.kind === "source" ? 13 : 16 }} />
            </IconButton>
          </Tooltip>
        </>
      )}

      {showPlaceholder && (
        // A real element rather than the :empty::before trick: an emptied
        // contentEditable is "<div><br></div>", which is not :empty, so the CSS
        // placeholder never came back after the first thing the user deleted.
        <Typography
          aria-hidden
          sx={{
            position: "absolute", top: 16, insetInlineStart: 16,
            color: "text.disabled", pointerEvents: "none",
          }}
        >
          {placeholder}
        </Typography>
      )}
    </Box>
  );
});

RichNoteEditor.displayName = "RichNoteEditor";

export default RichNoteEditor;
