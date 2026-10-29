import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import AddCommentIcon from "@mui/icons-material/AddCommentOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import NoteAddIcon from "@mui/icons-material/NoteAddOutlined";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { statuses } from "../../../../../utilities/constant";
import { hebrewForError } from "../../../../../utilities/apiError";
import { placeOf, canOpenPlace, openPlace } from "../../../../../utilities/discussionPlace";
import { canSaveAnswer } from "../../../../../utilities/discussionNote";
import { SAVE_STATES } from "../../useAIDiscussionController";

// The conversation with the AI about ONE lesson. Presentation only: `chat` is
// what useAIDiscussionController hands it.
//
// Every answer is grounded in the lesson's own passages and cites them as [n].
// Those markers become small buttons inside the text, and the passages are
// listed again under the answer — each opening where it is: a moment in the
// recording, a page of the book. A citation the user can check is the whole
// point of answering from the lesson rather than from the model.

// Mirrors MAX_QUESTION_CHARS in the server's controllersDiscussion.js.
const MAX_QUESTION_CHARS = 1000;

// Offered on an empty conversation, so the first question costs no thought.
const SUGGESTIONS = [
  "מה הנקודה המרכזית?",
  "סכם בשלוש נקודות",
  "אילו מקורות הוזכרו?",
];

// The answer's text, with each [n] turned into a button for passage n. A
// marker with no citation behind it stays the plain text it is — the server
// removes invented ones, so this is belt and braces, not a path that matters.
const AnswerText = ({ content, citations, onOpen }) => {
  const byN = new Map((citations ?? []).map((c) => [Number(c.n), c]));
  const parts = String(content).split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const n = /^\[(\d+)\]$/.exec(part)?.[1];
    const citation = n ? byN.get(Number(n)) : null;
    if (!citation) return part;
    const place = placeOf(citation);
    const openable = onOpen.can(place);
    return (
      <Tooltip key={i} title={`${place.label}${citation.quote ? ` — ${citation.quote}…` : ""}`} arrow>
        <Box
          component={openable ? "button" : "span"}
          type={openable ? "button" : undefined}
          onClick={openable ? () => onOpen.go(place) : undefined}
          aria-label={openable ? `מקור ${n}, ${place.label}` : undefined}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            mx: 0.25,
            px: 0.5,
            border: 0,
            borderRadius: 1,
            font: "inherit",
            fontSize: "0.75em",
            fontWeight: 700,
            verticalAlign: "super",
            lineHeight: 1.2,
            color: "primary.main",
            bgcolor: "action.selected",
            cursor: openable ? "pointer" : "default",
            "&:hover": openable ? { bgcolor: "primary.light", color: "primary.contrastText" } : undefined,
          }}
        >
          {n}
        </Box>
      </Tooltip>
    );
  });
};

// The "thinking" line, by the step the server says the answer is at. Before
// it has said anything, the general line; finding the passages is the slow
// part of a long lesson, so that one is named.
const waitingLabel = (stage, inSource) => {
  if (stage === "writing") return "כותב תשובה…";
  if (stage === "searching") return `מחפש קטעים ${inSource}…`;
  return `מעיין ${inSource}…`;
};

const Sources = ({ citations, onOpen }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }} data-testid="answer-sources">
    {citations.map((c) => {
      const place = placeOf(c);
      const openable = onOpen.can(place);
      return (
        <Chip
          key={c.n}
          size="small"
          variant="outlined"
          color={openable ? "primary" : "default"}
          icon={place.kind === "time" ? <PlayArrowIcon /> : place.kind === "page" ? <MenuBookIcon /> : undefined}
          label={`[${c.n}] ${place.label}`}
          onClick={openable ? () => onOpen.go(place) : undefined}
        />
      );
    })}
  </Box>
);

// "שמור למחברת" under an answer. Saved once, it says so and stays pressed for
// this visit; a failure says so and can be pressed again.
const SAVE_LABELS = {
  [SAVE_STATES.saving]: "שומר…",
  [SAVE_STATES.saved]: "נשמר במחברת",
  [SAVE_STATES.failed]: "השמירה נכשלה — נסה שוב",
};

const SaveAnswerButton = ({ state, onSave }) => (
  <Button
    size="small"
    onClick={onSave}
    disabled={state === SAVE_STATES.saving || state === SAVE_STATES.saved}
    color={state === SAVE_STATES.failed ? "error" : "primary"}
    startIcon={state === SAVE_STATES.saved ? <CheckIcon /> : <NoteAddIcon />}
    sx={{ mt: 0.5, px: 0.5, minWidth: 0 }}
  >
    {SAVE_LABELS[state] ?? "שמור למחברת"}
  </Button>
);

// The save button for each answer in `messages` that can be saved — what a
// pane hands MessageBubble. Shared with the history mode.
export const answerSaver = (notebook, messages) => (message) =>
  notebook && canSaveAnswer(message)
    ? { state: notebook.saved[message.id], onSave: () => notebook.save(messages, message.id) }
    : null;

// "העתק שיחה": ONE button for the whole conversation, beside "שיחה חדשה" —
// not one under every answer, which would double the buttons in a thread
// that already has a save button and sources under each. Shared with the
// history mode, where it copies the conversation open there.
export const CopyConversationButton = ({ onCopy, disabled = false }) =>
  onCopy ? (
    <Button size="small" startIcon={<ContentCopyIcon />} onClick={onCopy} disabled={disabled}>
      העתק שיחה
    </Button>
  ) : null;

// Exported for the history mode, which shows an earlier conversation exactly
// as the chat does — the same bubbles, the same clickable sources.
export const MessageBubble = ({ message, onOpen, save = null }) => {
  const mine = message.role === "user";
  return (
    <Box
      data-testid={mine ? "message-user" : "message-assistant"}
      aria-busy={message.streaming ? true : undefined}
      sx={{
        // The reader's own questions on the far side, the answers where the
        // eye starts — the start edge, which in this page is the right.
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: mine ? "85%" : "100%",
        px: 1.5,
        py: 1,
        borderRadius: 2,
        bgcolor: mine ? "primary.main" : "action.hover",
        color: mine ? "primary.contrastText" : "text.primary",
        opacity: message.pending ? 0.7 : 1,
      }}
    >
      <Typography variant="body2" component="div" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
        {mine ? message.content : <AnswerText content={message.content} citations={message.citations} onOpen={onOpen} />}
      </Typography>
      {!mine && message.citations?.length > 0 && <Sources citations={message.citations} onOpen={onOpen} />}
      {save && <SaveAnswerButton state={save.state} onSave={save.onSave} />}
    </Box>
  );
};

// Whether a cited place can be opened here, and opening it — what a bubble's
// sources are handed. Shared with the history mode.
export const placeOpener = ({ onSeek, onOpenPage }) => ({
  can: (place) => canOpenPlace(place, { onSeek, onOpenPage }),
  go: (place) => openPlace(place, { onSeek, onOpenPage }),
});

// The line under the question box: today's questions left. Only for a reader
// the quota binds (quota is null otherwise); said in amber when few are left,
// so the limit is seen coming rather than met as a refusal.
const FEW_LEFT = 5;

export const quotaLabel = ({ limit, remaining }) => {
  if (remaining <= 0) return `ניצלת היום את כל ${limit} השאלות. אפשר להמשיך מחר — והחיפוש החכם זמין גם עכשיו.`;
  if (remaining === 1) return `נשארה לך היום שאלה אחת מתוך ${limit}`;
  return `נשארו לך היום ${remaining} שאלות מתוך ${limit}`;
};

const ChatPane = ({ chat, notebook = null, isText = false, onSeek, onOpenPage }) => {
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  const onOpen = placeOpener({ onSeek, onOpenPage });
  const saverFor = answerSaver(notebook, chat.messages);

  // Keep the newest message in view: the question as it is sent, the
  // "thinking" line, then the answer.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [chat.messages.length, chat.asking]);

  const send = async (text = draft) => {
    const question = text.trim();
    if (!question || chat.asking) return;
    setDraft("");
    const answered = await chat.ask(question);
    // The server kept nothing, so neither does the thread — but the words are
    // put back, unless something new has been typed in the meantime.
    if (!answered) setDraft((current) => current || question);
  };

  const onKeyDown = (e) => {
    // Enter sends; Shift+Enter is a new line, as in every chat box.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      send();
    }
  };

  if (chat.loadStatus === statuses.loading || chat.loadStatus === statuses.idle) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} aria-label="טוען את השיחה" />
      </Box>
    );
  }

  if (chat.loadStatus === statuses.failed) {
    return (
      <Alert
        severity="error"
        action={<Button color="inherit" size="small" onClick={chat.retryLoad}>נסה שוב</Button>}
      >
        {hebrewForError(chat.loadError, "טעינת השיחה נכשלה.")}
      </Alert>
    );
  }

  const empty = chat.messages.length === 0;
  // Once the first piece of the answer is on screen it is its own progress
  // indicator; the "thinking" line is only for the wait before it.
  const answerArriving = chat.messages.some((m) => m.streaming && m.content);
  // Two forms, because Hebrew merges the preposition with the article:
  // "ב" + "השיעור" is "בשיעור", never "בהשיעור".
  const source = isText ? "הספר" : "השיעור";
  const inSource = isText ? "בספר" : "בשיעור";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 1 }}>
      {!empty && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <CopyConversationButton
            onCopy={chat.copy && (() => chat.copy(chat.messages))}
            // Mid-answer the copy would hold half an answer, or none.
            disabled={chat.asking}
          />
          <Button
            size="small"
            startIcon={<AddCommentIcon />}
            onClick={chat.startNew}
            disabled={chat.asking}
          >
            שיחה חדשה
          </Button>
        </Box>
      )}

      <Box
        role="log"
        aria-live="polite"
        aria-label="השיחה"
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, py: 0.5 }}
      >
        {empty && (
          <Box data-testid="chat-empty">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              אפשר לשאול כל שאלה על {source}. התשובה תתבסס רק על מה שנאמר בו, עם הפניה למקום המדויק.
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} variant="outlined" onClick={() => send(s)} disabled={chat.asking} />
              ))}
            </Box>
          </Box>
        )}

        {chat.messages.map((m) => <MessageBubble key={m.id} message={m} onOpen={onOpen} save={saverFor(m)} />)}

        {chat.asking && !answerArriving && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }} data-testid="chat-thinking">
            <CircularProgress size={16} />
            <Typography variant="body2">{waitingLabel(chat.askStage, inSource)}</Typography>
          </Box>
        )}
        <div ref={endRef} />
      </Box>

      {chat.askError && (
        <Alert severity="error" onClose={chat.dismissAskError}>
          {hebrewForError(chat.askError, "לא התקבלה תשובה. נסה לשאול שוב.")}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); send(); }}
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          // On a phone the panel is not height-capped and the whole page
          // scrolls; sticky keeps the box reachable under a long thread.
          position: "sticky",
          bottom: 0,
          bgcolor: "background.paper",
          pt: 0.5,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_QUESTION_CHARS))}
          onKeyDown={onKeyDown}
          placeholder={`שאל שאלה על ${source}…`}
          inputProps={{ "aria-label": "שאלה", maxLength: MAX_QUESTION_CHARS }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!draft.trim() || chat.asking}
          aria-label="שלח"
          // The icon points right; in a right-to-left page "send" points left.
          sx={{ "& svg": { transform: "scaleX(-1)" } }}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {chat.quota && (
        <Typography
          variant="caption"
          data-testid="chat-quota"
          color={chat.quota.remaining <= FEW_LEFT ? "warning.main" : "text.secondary"}
          sx={{ textAlign: "center" }}
        >
          {quotaLabel(chat.quota)}
        </Typography>
      )}

      <Typography variant="caption" color="text.disabled" sx={{ textAlign: "center" }}>
        התשובות נוצרות על ידי AI ועלולות לטעות — לחצו על מקור כדי לבדוק.
      </Typography>
    </Box>
  );
};

export default ChatPane;
