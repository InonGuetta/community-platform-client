import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { sanitizeNoteHtml, isNoteHtmlEmpty } from "../../../../utilities/noteHtml";

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

const RichNoteEditor = forwardRef(({ html, onChange, onFormatsChange, onFocus, onError, placeholder }, ref) => {
  const editorRef = useRef(null);
  // The last selection that was inside THIS editor. See the third note above.
  const savedRange = useRef(null);

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
    <Box sx={{ position: "relative", flexGrow: 1, display: "flex" }}>
      <Box
        ref={editorRef}
        component="div"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="גוף ההערה"
        onInput={emitChange}
        onBlur={() => {
          rememberSelection();
          onChange(sanitizeNoteHtml(editorRef.current?.innerHTML ?? ""));
        }}
        onPaste={handlePaste}
        onKeyUp={reportFormats}
        onMouseUp={reportFormats}
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
        }}
      />

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
