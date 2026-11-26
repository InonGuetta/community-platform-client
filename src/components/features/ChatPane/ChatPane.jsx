import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ButtonBase from "@mui/material/ButtonBase";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import AddCommentIcon from "@mui/icons-material/AddCommentOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import NoteAddIcon from "@mui/icons-material/NoteAddOutlined";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { statuses } from "../../../utilities/constant";
import { messageForError } from "../../../utilities/apiError";
import { placeOf, canOpenPlace, openPlace } from "../../../utilities/discussionPlace";
import { canSaveAnswer, SAVE_STATES } from "../../../utilities/discussionNote";
import { useTranslation } from "react-i18next";
import { useDirection } from "../../../i18n/useDirection";
import { RADIUS, SHADOW } from "../../../theme/tokens";
import i18n from "../../../i18n/i18n";

// The conversation with the AI — about one lesson, in the lesson page's
// "דיון עם AI" tab, or about the whole archive, on /ask. Presentation only:
// `chat` is what useAIDiscussionController or useAskArchivePageController
// hands it, and `subject` — "lesson", "book" or "archive" — picks the
// sentences that differ between them (the "chat" namespace, by context).
//
// Every answer is grounded in the lesson's own passages and cites them as [n].
// Those markers become small buttons inside the text, and the passages are
// listed again under the answer — each opening where it is: a moment in the
// recording, a page of the book. A citation the user can check is the whole
// point of answering from the lesson rather than from the model.

// Mirrors MAX_QUESTION_CHARS in the server's controllersDiscussion.js.
const MAX_QUESTION_CHARS = 1000;

// Offered on an empty conversation, so the first question costs no thought.
// These fixed three are the fallback: a lesson's own questions, written from
// its summary after processing (PRD ASK-7, migration 045), come first — they
// are about THIS lesson rather than the same three on every lesson.
export const fixedSuggestions = () => i18n.t("chat:suggestions", { returnObjects: true });

// The answer's text, with each [n] turned into a button for passage n. A
// marker with no citation behind it stays the plain text it is — the server
// removes invented ones, so this is belt and braces, not a path that matters.
const AnswerText = ({ content, citations, onOpen }) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  // Subscribed for the re-render only: a compiled parent hands back the same
  // element on a language change, and this would keep the old words.
  useTranslation();
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
          aria-label={openable ? i18n.t("chat:citation", { n, place: place.label }) : undefined}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            mx: 0.25,
            px: 0.5,
            border: 0,
            borderRadius: "6px",
            font: "inherit",
            fontSize: "0.75em",
            fontWeight: 700,
            verticalAlign: "super",
            lineHeight: 1.2,
            color: "primary.main",
            bgcolor: "surface.accentSoft",
            cursor: openable ? "pointer" : "default",
            "&:hover": openable ? { bgcolor: "primary.main", color: "primary.contrastText" } : undefined,
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
const waitingLabel = (t, stage, subject) => {
  if (stage === "writing") return t("waiting.writing");
  return t(stage === "searching" ? "waiting.searching" : "waiting.reading", { context: subject });
};

const Sources = ({ citations, onOpen }) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  // Subscribed for the re-render only: a compiled parent hands back the same
  // element on a language change, and this would keep the old words.
  useTranslation();
  return (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }} data-testid="answer-sources">
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
          sx={openable ? { bgcolor: "surface.accentSoft", borderColor: "transparent", color: "primary.main" } : undefined}
        />
      );
    })}
  </Box>
  );
};

// "Save to notebook" under an answer. Saved once, it says so and stays pressed
// for this visit; a failure says so and can be pressed again.
const SAVE_KEYS = {
  [SAVE_STATES.saving]: "save.saving",
  [SAVE_STATES.saved]: "save.saved",
  [SAVE_STATES.failed]: "save.failed",
};

const SaveAnswerButton = ({ state, onSave }) => {
  const { t } = useTranslation("chat");
  return (
  <Button
    size="small"
    onClick={onSave}
    disabled={state === SAVE_STATES.saving || state === SAVE_STATES.saved}
    color={state === SAVE_STATES.failed ? "error" : "primary"}
    startIcon={state === SAVE_STATES.saved ? <CheckIcon /> : <NoteAddIcon />}
    sx={{ mt: 0.5, px: 0.5, minWidth: 0 }}
  >
    {t(SAVE_KEYS[state] ?? "save.save")}
  </Button>
  );
};

// The save button for each answer in `messages` that can be saved — what a
// pane hands MessageBubble. Shared with the history mode.
export const answerSaver = (notebook, messages) => (message) =>
  notebook && canSaveAnswer(message)
    ? { state: notebook.saved[message.id], onSave: () => notebook.save(messages, message.id) }
    : null;

// "Copy conversation": ONE button for the whole conversation, beside "שיחה חדשה" —
// not one under every answer, which would double the buttons in a thread
// that already has a save button and sources under each. Shared with the
// history mode, where it copies the conversation open there.
export const CopyConversationButton = ({ onCopy, disabled = false }) => {
  const { t } = useTranslation("chat");
  return onCopy ? (
    <Button size="small" startIcon={<ContentCopyIcon />} onClick={onCopy} disabled={disabled}>
      {t("copy")}
    </Button>
  ) : null;
};

// Exported for the history mode, which shows an earlier conversation exactly
// as the chat does — the same bubbles, the same clickable sources.
export const MessageBubble = ({ message, onOpen, save = null }) => {
  const mine = message.role === "user";
  return (
    <Box
      data-testid={mine ? "message-user" : "message-assistant"}
      aria-busy={message.streaming ? true : undefined}
      sx={{
        // Redesign v4 (screen 24, and /ask): the reader's question in accent
        // with white text at the START side, the answer white with a hairline
        // at the END side. In a flex column `flex-start` is the start edge in
        // either direction.
        alignSelf: mine ? "flex-start" : "flex-end",
        maxWidth: mine ? "85%" : "92%",
        px: 2,
        py: 1.5,
        borderRadius: `${RADIUS.menu}px`,
        bgcolor: mine ? "primary.main" : "background.paper",
        color: mine ? "primary.contrastText" : "text.primary",
        border: "1px solid",
        borderColor: mine ? "primary.main" : "divider",
        opacity: message.pending ? 0.7 : 1,
      }}
    >
      <Typography variant="body2" component="div" dir="auto" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 15 }}>
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
  if (remaining <= 0) return i18n.t("chat:quota.none", { limit });
  if (remaining === 1) return i18n.t("chat:quota.one", { limit });
  return i18n.t("chat:quota.many", { remaining, limit });
};

// The lesson's questions when it has any, the fixed ones otherwise.
export const suggestionsFor = (questions) =>
  Array.isArray(questions) && questions.length > 0 ? questions : fixedSuggestions();

const ChatPane = ({
  chat, notebook = null, isText = false, onSeek, onOpenPage, suggestedQuestions = null,
  // The archive page opens a citation in its own lesson, and is about the
  // archive: subject "archive". Otherwise the subject follows isText.
  opener = null, subject: givenSubject = null,
  // The archive page draws "שיחה חדשה" / "העתק שיחה" in its own header and
  // floats the question box `inputBottom` above the screen's edge.
  hideActions = false, inputBottom = 0,
}) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  const { t } = useTranslation("chat");
  const { rtl } = useDirection();
  const subject = givenSubject ?? (isText ? "book" : "lesson");
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  const onOpen = opener ?? placeOpener({ onSeek, onOpenPage });
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
        <CircularProgress size={24} aria-label={t("loading")} />
      </Box>
    );
  }

  if (chat.loadStatus === statuses.failed) {
    return (
      <Alert
        severity="error"
        action={<Button color="inherit" size="small" onClick={chat.retryLoad}>{t("retry")}</Button>}
      >
        {messageForError(chat.loadError, t("loadFailed"))}
      </Alert>
    );
  }

  const empty = chat.messages.length === 0;
  // Once the first piece of the answer is on screen it is its own progress
  // indicator; the "thinking" line is only for the wait before it.
  const answerArriving = chat.messages.some((m) => m.streaming && m.content);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 1 }}>
      {!empty && !hideActions && (
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
            {t("newChat")}
          </Button>
        </Box>
      )}

      <Box
        role="log"
        aria-live="polite"
        aria-label={t("log")}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, py: 0.5 }}
      >
        {empty && (
          <Box data-testid="chat-empty">
            <Typography sx={{ fontSize: 16, lineHeight: 1.7, mb: 2 }}>
              {t("intro", { context: subject })}
            </Typography>
            {/* Full-width rows (screen 24): fill-2, radius 16, bold. */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {suggestionsFor(suggestedQuestions).map((s) => (
                <ButtonBase
                  key={s}
                  onClick={() => send(s)}
                  disabled={chat.asking}
                  sx={{
                    width: "100%",
                    justifyContent: "flex-start",
                    textAlign: "start",
                    px: 2.5,
                    py: 1.75,
                    borderRadius: `${RADIUS.menu}px`,
                    bgcolor: "surface.fill2",
                    fontSize: 15,
                    fontWeight: 600,
                    "&:hover": { bgcolor: "surface.fillHover" },
                    "&.Mui-disabled": { opacity: 0.6 },
                  }}
                >
                  {s}
                </ButtonBase>
              ))}
            </Box>
          </Box>
        )}

        {chat.messages.map((m) => <MessageBubble key={m.id} message={m} onOpen={onOpen} save={saverFor(m)} />)}

        {chat.asking && !answerArriving && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }} data-testid="chat-thinking">
            <CircularProgress size={16} />
            <Typography variant="body2">{waitingLabel(t, chat.askStage, subject)}</Typography>
          </Box>
        )}
        <div ref={endRef} />
      </Box>

      {chat.askError && (
        <Alert severity="error" onClose={chat.dismissAskError}>
          {messageForError(chat.askError, t("askFailed"))}
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
          bottom: inputBottom,
          zIndex: 1,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: `${RADIUS.hero}px`,
          boxShadow: SHADOW.card,
          p: 0.75,
          paddingInlineStart: 2,
          "&:focus-within": { borderColor: "primary.main" },
        }}
      >
        <InputBase
          fullWidth
          multiline
          maxRows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_QUESTION_CHARS))}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder", { context: subject })}
          inputProps={{ "aria-label": t("question"), maxLength: MAX_QUESTION_CHARS }}
          sx={{ flex: 1, px: 1, py: 0.75, fontSize: 15 }}
        />
        <IconButton
          type="submit"
          disabled={!draft.trim() || chat.asking}
          aria-label={t("send")}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark" },
            "&.Mui-disabled": { bgcolor: "surface.fill", color: "text.disabled" },
            // The icon points right; in a right-to-left page "send" points left.
            "& svg": { transform: rtl ? "scaleX(-1)" : "none" },
          }}
        >
          <SendIcon fontSize="small" />
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
        {t("disclaimer")}
      </Typography>
    </Box>
  );
};

export default ChatPane;
