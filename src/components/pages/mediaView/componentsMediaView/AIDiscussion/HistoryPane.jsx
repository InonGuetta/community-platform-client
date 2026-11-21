import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
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
import DirectionalIcon from "../../../../../components/features/DirectionalIcon/DirectionalIcon";
import ChatIcon from "@mui/icons-material/ChatOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { statuses } from "../../../../../utilities/constant";
import { messageForError } from "../../../../../utilities/apiError";
import { formatDate } from "../../../../../utilities/formatDate";
import { MessageBubble, placeOpener, answerSaver, CopyConversationButton } from "../../../../features/ChatPane/ChatPane";
import StatusBadge from "../../../../features/StatusBadge/StatusBadge";
import { useTranslation } from "react-i18next";

// The reader's earlier conversations on THIS lesson. Presentation only:
// `history` is what useAIDiscussionController hands it.
//
// Two views. The list: each conversation titled by its first question, with
// its date and how many questions it holds; the current one is marked. And one
// conversation, read exactly as the chat shows it — sources clickable — with
// "continue this conversation" to make it the current conversation again and go back
// to asking in it. Each row can be deleted, after a confirmation — what was
// written in it is erased on the server and cannot be brought back.

const ConversationRow = ({ item, current, onOpen, onDelete, deleting }) => {
  const { t } = useTranslation("lesson");
  const title = item.first_question || t("history.untitled");
  return (
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
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">
          {formatDate(item.updated_at)} · {t("history.questions", { count: item.questions })}
        </Typography>
        {current && <StatusBadge size="small" tone="indigo">{t("history.current")}</StatusBadge>}
      </Box>
    </ButtonBase>
    {/* Beside the row, not inside it: a button within a button is neither
        valid markup nor one click target. */}
    <Tooltip title={t("history.delete")}>
      <span>
        <IconButton
          size="small"
          onClick={() => onDelete(item)}
          disabled={deleting}
          aria-label={t("history.deleteNamed", { title })}
          sx={{ mx: 0.5 }}
        >
          {deleting ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  </Paper>
  );
};

// Asked before anything is deleted: the words are erased on the server, and
// there is no undo to offer instead.
const ConfirmDelete = ({ item, onCancel, onConfirm }) => {
  const { t } = useTranslation(["lesson", "common"]);
  return (
  <Dialog open={Boolean(item)} onClose={onCancel} aria-labelledby="delete-conversation-title">
    <DialogTitle id="delete-conversation-title">{t("history.deleteTitle")}</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {item?.first_question ? `"${item.first_question}" — ` : ""}
        {t("history.deleteBody")}
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>{t("common:actions.cancel")}</Button>
      <Button color="error" variant="contained" onClick={onConfirm}>{t("history.deleteConfirm")}</Button>
    </DialogActions>
  </Dialog>
  );
};

const ConversationView = ({ history, notebook, onSeek, onOpenPage }) => {
  const { t } = useTranslation("lesson");
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
        <Button size="small" startIcon={<DirectionalIcon toward="back" />} onClick={history.close}>
          {t("history.backToList")}
        </Button>
        {viewing.status === statuses.succeeded && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <CopyConversationButton onCopy={history.copy && (() => history.copy(viewing.messages))} />
            <Button
              size="small"
              variant="contained"
              startIcon={<ChatIcon />}
              onClick={continueHere}
              disabled={continuing}
            >
              {isCurrent ? t("history.backToChat") : t("history.resume")}
            </Button>
          </Box>
        )}
      </Box>

      {viewing.resumeError && (
        <Alert severity="error">
          {messageForError(viewing.resumeError, t("history.resumeFailed"))}
        </Alert>
      )}

      {viewing.status === statuses.loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} aria-label={t("history.loading")} />
        </Box>
      )}
      {viewing.status === statuses.failed && (
        <Alert severity="error">{messageForError(viewing.error, t("history.openFailed"))}</Alert>
      )}
      {viewing.status === statuses.succeeded && (
        <Box
          role="log"
          aria-label={t("history.previous")}
          sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, py: 0.5 }}
        >
          {viewing.messages.map((m) => <MessageBubble key={m.id} message={m} onOpen={onOpen} save={saverFor(m)} />)}
        </Box>
      )}
    </Box>
  );
};

const HistoryPane = ({ history, notebook = null, isText = false, onSeek, onOpenPage }) => {
  const { t } = useTranslation("lesson");
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
        <CircularProgress size={24} aria-label={t("history.loadingList")} />
      </Box>
    );
  }

  if (history.status === statuses.failed) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={history.retry}>{t("history.retry")}</Button>}>
        {messageForError(history.error, t("history.listFailed"))}
      </Alert>
    );
  }

  if (history.items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="history-empty">
        {t("history.empty", { context: isText ? "book" : "lesson" })}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {history.deleteError && (
        <Alert severity="error">{messageForError(history.deleteError, t("history.deleteFailed"))}</Alert>
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
