import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { mediaApi } from "../../../../api/mediaApi";
import { formatTime } from "../../../../utilities/formatTime";

// "צ'אט המפגש" (PRD REC-3): the chat of the live session this lesson was
// recorded in — only what was written while recording, by those whose voice
// is in the recording. Each message carries where in the recording it was
// written, and pressing that time plays the moment it was about.

export const useSessionChat = (mediaId) => {
  const [state, setState] = useState({ status: "loading", messages: [] });
  useEffect(() => {
    if (!mediaId) return undefined;
    let current = true;
    setState({ status: "loading", messages: [] });
    mediaApi.sessionChat(mediaId)
      .then((messages) => { if (current) setState({ status: "ready", messages: Array.isArray(messages) ? messages : [] }); })
      .catch(() => { if (current) setState({ status: "failed", messages: [] }); });
    return () => { current = false; };
  }, [mediaId]);
  return state;
};

const SessionChatPanel = ({ mediaId, onSeek }) => {
  const { status, messages } = useSessionChat(mediaId);

  if (status === "loading") {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} aria-label="טוען את הצ'אט" /></Box>;
  }
  if (status === "failed") return <Alert severity="error">{"טעינת הצ'אט מהמפגש נכשלה."}</Alert>;
  if (messages.length === 0) {
    return <Typography variant="body2" color="text.secondary">{"לא נכתבו הודעות בצ'אט בזמן ההקלטה."}</Typography>;
  }

  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.25 }} aria-label="הצ'אט מהמפגש">
      <Typography variant="caption" color="text.secondary" component="li">
        {"ההודעות שנכתבו בצ'אט בזמן ההקלטה. לחיצה על הזמן מנגנת את הרגע שבו נכתבו."}
      </Typography>
      {messages.map((m, i) => (
        <Box component="li" key={i} sx={{ display: "flex", gap: 1.25, alignItems: "baseline" }}>
          {typeof m.offset === "number" && onSeek ? (
            <ButtonBase
              onClick={() => onSeek(m.offset)}
              aria-label={`נגן מ־${formatTime(m.offset)}`}
              sx={{ fontSize: "0.75rem", fontWeight: 700, color: "primary.main", borderRadius: 1, px: 0.5, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(m.offset)}
            </ButtonBase>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">{m.name || "משתתף"}</Typography>
            {/* Plain text, never markup: it is what a participant typed. */}
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.text}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default SessionChatPanel;
