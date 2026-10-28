import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChatIcon from "@mui/icons-material/ChatOutlined";
import { statuses } from "../../../../../utilities/constant";
import { hebrewForError } from "../../../../../utilities/apiError";
import { formatHebrewDate } from "../../../../../utilities/formatDate";
import { MessageBubble, placeOpener } from "./ChatPane";

// The reader's earlier conversations on THIS lesson. Presentation only:
// `history` is what useAIDiscussionController hands it.
//
// Two views. The list: each conversation titled by its first question, with
// its date and how many questions it holds; the current one is marked. And one
// conversation, read exactly as the chat shows it — sources clickable — with
// "המשך את השיחה הזו" to make it the current conversation again and go back
// to asking in it.

const questionsLabel = (n) => (n === 1 ? "שאלה אחת" : `${n} שאלות`);

const ConversationRow = ({ item, current, onOpen }) => (
  <Paper variant="outlined" data-testid="history-item" sx={{ overflow: "hidden" }}>
    <ButtonBase
      onClick={() => onOpen(item.id)}
      sx={{ width: "100%", display: "block", textAlign: "start", p: 1.5, "&:hover": { bgcolor: "action.hover" } }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
        {item.first_question || "שיחה"}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">
          {formatHebrewDate(item.updated_at)} · {questionsLabel(item.questions)}
        </Typography>
        {current && <Chip size="small" color="primary" variant="outlined" label="השיחה הנוכחית" />}
      </Box>
    </ButtonBase>
  </Paper>
);

const ConversationView = ({ history, onSeek, onOpenPage }) => {
  const { viewing } = history;
  const [continuing, setContinuing] = useState(false);
  const isCurrent = viewing.conversationId === history.currentId;
  const onOpen = placeOpener({ onSeek, onOpenPage });

  const continueHere = async () => {
    setContinuing(true);
    await history.continueConversation(viewing.conversationId);
    setContinuing(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        {/* Forward in a right-to-left page points to the right — back to the list. */}
        <Button size="small" startIcon={<ArrowForwardIcon />} onClick={history.close}>
          חזרה לרשימה
        </Button>
        {viewing.status === statuses.succeeded && (
          <Button
            size="small"
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={continueHere}
            disabled={continuing}
          >
            {isCurrent ? "חזרה לשיחה" : "המשך את השיחה הזו"}
          </Button>
        )}
      </Box>

      {viewing.resumeError && (
        <Alert severity="error">
          {hebrewForError(viewing.resumeError, "לא הצלחנו להמשיך את השיחה. נסה שוב.")}
        </Alert>
      )}

      {viewing.status === statuses.loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} aria-label="טוען את השיחה" />
        </Box>
      )}
      {viewing.status === statuses.failed && (
        <Alert severity="error">{hebrewForError(viewing.error, "פתיחת השיחה נכשלה.")}</Alert>
      )}
      {viewing.status === statuses.succeeded && (
        <Box
          role="log"
          aria-label="שיחה קודמת"
          sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, py: 0.5 }}
        >
          {viewing.messages.map((m) => <MessageBubble key={m.id} message={m} onOpen={onOpen} />)}
        </Box>
      )}
    </Box>
  );
};

const HistoryPane = ({ history, isText = false, onSeek, onOpenPage }) => {
  if (history.viewing.conversationId !== null) {
    return <ConversationView history={history} onSeek={onSeek} onOpenPage={onOpenPage} />;
  }

  if (history.status === statuses.loading || history.status === statuses.idle) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} aria-label="טוען את ההיסטוריה" />
      </Box>
    );
  }

  if (history.status === statuses.failed) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={history.retry}>נסה שוב</Button>}>
        {hebrewForError(history.error, "טעינת ההיסטוריה נכשלה.")}
      </Alert>
    );
  }

  if (history.items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="history-empty">
        עדיין אין שיחות קודמות על {isText ? "הספר" : "השיעור"} הזה. שיחה תופיע כאן אחרי השאלה הראשונה בה.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {history.items.map((item) => (
        <ConversationRow key={item.id} item={item} current={item.id === history.currentId} onOpen={history.open} />
      ))}
    </Box>
  );
};

export default HistoryPane;
