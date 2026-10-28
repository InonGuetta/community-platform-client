import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChatIcon from "@mui/icons-material/ChatOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { statuses } from "../../../../../utilities/constant";
import { hebrewForError } from "../../../../../utilities/apiError";
import { formatHebrewDate } from "../../../../../utilities/formatDate";
import { MessageBubble, placeOpener, answerSaver } from "./ChatPane";

// The reader's earlier conversations on THIS lesson. Presentation only:
// `history` is what useAIDiscussionController hands it.
//
// Two views. The list: each conversation titled by its first question, with
// its date and how many questions it holds; the current one is marked. And one
// conversation, read exactly as the chat shows it — sources clickable — with
// "המשך את השיחה הזו" to make it the current conversation again and go back
// to asking in it. Each row can be deleted, after a confirmation — what was
// written in it is erased on the server and cannot be brought back.

const questionsLabel = (n) => (n === 1 ? "שאלה אחת" : `${n} שאלות`);

const ConversationRow = ({ item, current, onOpen, onDelete, deleting }) => (
  <Paper
    variant="outlined"
    data-testid="history-item"
    sx={{ overflow: "hidden", display: "flex", alignItems: "center", opacity: deleting ? 0.5 : 1 }}
  >
    <ButtonBase
      onClick={() => onOpen(item.id)}
      disabled={deleting}
      sx={{ flex: 1, minWidth: 0, display: "block", textAlign: "start", p: 1.5, "&:hover": { bgcolor: "action.hover" } }}
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
    {/* Beside the row, not inside it: a button within a button is neither
        valid markup nor one click target. */}
    <Tooltip title="מחק שיחה">
      <span>
        <IconButton
          size="small"
          onClick={() => onDelete(item)}
          disabled={deleting}
          aria-label={`מחק את השיחה "${item.first_question || "שיחה"}"`}
          sx={{ mx: 0.5 }}
        >
          {deleting ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  </Paper>
);

// Asked before anything is deleted: the words are erased on the server, and
// there is no undo to offer instead.
const ConfirmDelete = ({ item, onCancel, onConfirm }) => (
  <Dialog open={Boolean(item)} onClose={onCancel} aria-labelledby="delete-conversation-title">
    <DialogTitle id="delete-conversation-title">למחוק את השיחה?</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {item?.first_question ? `"${item.first_question}" — ` : ""}
        השאלות והתשובות בשיחה יימחקו ולא יהיה אפשר לשחזר אותן. תשובות ששמרת במחברת יישארו בה.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>ביטול</Button>
      <Button color="error" variant="contained" onClick={onConfirm}>מחק</Button>
    </DialogActions>
  </Dialog>
);

const ConversationView = ({ history, notebook, onSeek, onOpenPage }) => {
  const { viewing } = history;
  const [continuing, setContinuing] = useState(false);
  const isCurrent = viewing.conversationId === history.currentId;
  const onOpen = placeOpener({ onSeek, onOpenPage });
  const saverFor = answerSaver(notebook, viewing.messages);

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
          {viewing.messages.map((m) => <MessageBubble key={m.id} message={m} onOpen={onOpen} save={saverFor(m)} />)}
        </Box>
      )}
    </Box>
  );
};

const HistoryPane = ({ history, notebook = null, isText = false, onSeek, onOpenPage }) => {
  // The row whose deletion is being confirmed.
  const [confirming, setConfirming] = useState(null);

  if (history.viewing.conversationId !== null) {
    return <ConversationView history={history} notebook={notebook} onSeek={onSeek} onOpenPage={onOpenPage} />;
  }

  const confirmDelete = () => {
    const { id } = confirming;
    setConfirming(null);
    history.remove(id);
  };

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
      {history.deleteError && (
        <Alert severity="error">{hebrewForError(history.deleteError, "מחיקת השיחה נכשלה. נסה שוב.")}</Alert>
      )}
      {history.items.map((item) => (
        <ConversationRow
          key={item.id}
          item={item}
          current={item.id === history.currentId}
          onOpen={history.open}
          onDelete={setConfirming}
          deleting={history.deletingId === item.id}
        />
      ))}
      <ConfirmDelete item={confirming} onCancel={() => setConfirming(null)} onConfirm={confirmDelete} />
    </Box>
  );
};

export default HistoryPane;
