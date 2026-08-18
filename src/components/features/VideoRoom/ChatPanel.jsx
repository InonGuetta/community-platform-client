import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";

// Text alongside the video, for the half of a chavruta that does not fit in
// speech: a source reference, a page number, a question asked without
// interrupting.
//
// Every message is rendered as TEXT. Never markup, never a link that resolves —
// this is the one surface in the room where one participant's input reaches
// every other participant's screen, and React's escaping is what keeps it a
// message rather than a payload.
const CHAT_MAX_CHARS = 2000; // mirrors CHAT_MAX_CHARS in the server's socketManager

const timeOf = (at) =>
  new Date(at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

const ChatPanel = ({ messages, onSend, myUserId }) => {
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);

  // Follows the conversation. Only on a new message, so a user who has scrolled
  // up to re-read something is not yanked back by their own re-render.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const submit = (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "grey.900" }}>
      <Typography variant="subtitle2" sx={{ p: 1.5, color: "grey.300", borderBottom: "1px solid", borderColor: "grey.800" }}>
        צ׳אט
      </Typography>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        {messages.length === 0 && (
          <Typography variant="caption" color="grey.500">
            אין הודעות עדיין. ההודעות אינן נשמרות לאחר סיום המפגש.
          </Typography>
        )}

        {messages.map((message, i) => {
          const mine = Number(message.userId) === Number(myUserId);
          return (
            <Box
              // The server stamps no id, so the index is part of the key. It is
              // safe here precisely because this list is append-only: nothing is
              // ever inserted, removed or reordered.
              key={`${message.at}-${i}`}
              sx={{
                alignSelf: mine ? "flex-start" : "flex-end",
                maxWidth: "85%",
                bgcolor: mine ? "primary.dark" : "grey.800",
                color: "grey.100",
                px: 1.25,
                py: 0.75,
                borderRadius: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {message.text}
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.500", display: "block", textAlign: "start" }}>
                {timeOf(message.at)}
              </Typography>
            </Box>
          );
        })}
        <Box ref={endRef} />
      </Box>

      <Box component="form" onSubmit={submit} sx={{ p: 1, borderTop: "1px solid", borderColor: "grey.800" }}>
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_CHARS))}
          placeholder="הודעה…"
          size="small"
          fullWidth
          multiline
          maxRows={4}
          // Enter sends, Shift+Enter breaks a line — the convention of every chat
          // the users of this already have open.
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          InputProps={{
            sx: { color: "grey.100", bgcolor: "grey.850" },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton type="submit" size="small" disabled={!draft.trim()} aria-label="שליחה">
                  <SendIcon fontSize="small" sx={{ color: draft.trim() ? "primary.light" : "grey.600" }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  );
};

export default ChatPanel;
