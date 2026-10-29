import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { statuses } from "../../../../../utilities/constant";
import { hebrewForError } from "../../../../../utilities/apiError";
import { headlineSegments } from "../../../../../utilities/searchHeadline";
import { placeOf, canOpenPlace, openPlace } from "../../../../../utilities/discussionPlace";

// Smart search inside ONE lesson: passages, ranked by meaning, nothing
// generated. A hit opens where it is — the player seeks to a moment in a
// recording, the reader turns to a page of a book.
//
// Runs on Enter or the button, never per keystroke: every search is an
// embedding and a GPT-4o rerank on the server, and the route allows twenty a
// minute.

// Mirrors MAX_QUERY_CHARS in the server's controllersDiscussion.js. Typing past
// it would only be refused with a 400.
const MAX_QUERY_CHARS = 300;

// The server's relevance is the reranker's 0–1 judgment. Only a clearly
// on-topic hit is marked — a percentage on every row invites reading noise as
// precision.
const STRONG = 0.7;

const ResultCard = ({ hit, isText, onSeek, onOpenPage }) => {
  const place = placeOf(hit);
  const openable = canOpenPlace(place, { onSeek, onOpenPage });
  const strong = Number(hit.similarity) >= STRONG;
  const segments = headlineSegments(hit.headline || hit.content || "");

  const body = (
    <Box sx={{ p: 1.5, width: "100%", textAlign: "start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Chip
          size="small"
          variant="outlined"
          color={openable ? "primary" : "default"}
          icon={place.kind === "time" ? <PlayArrowIcon /> : place.kind === "page" ? <MenuBookIcon /> : undefined}
          label={place.label}
        />
        {strong && (
          <Typography variant="caption" color="success.main" fontWeight={600}>
            התאמה גבוהה
          </Typography>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {segments.map((s, i) =>
          s.bold ? <Box component="mark" key={i} sx={{ bgcolor: "warning.light", color: "inherit", px: 0.25, borderRadius: 0.5 }}>{s.text}</Box> : s.text
        )}
        {segments.length > 0 && "…"}
      </Typography>
    </Box>
  );

  return (
    <Paper
      variant="outlined"
      data-testid="search-hit"
      sx={{
        overflow: "hidden",
        // The start edge is the right-hand one in this page; a strong hit is
        // marked there, where the eye starts reading the row.
        borderInlineStartWidth: strong ? 3 : 1,
        borderInlineStartColor: strong ? "success.main" : "divider",
      }}
    >
      {openable ? (
        <ButtonBase
          onClick={() => openPlace(place, { onSeek, onOpenPage })}
          aria-label={place.kind === "time" ? `נגן מ־${place.label}` : `פתח ב${isText ? "ספר" : "קובץ"} ב${place.label}`}
          sx={{ width: "100%", display: "block", "&:hover": { bgcolor: "action.hover" } }}
        >
          {body}
        </ButtonBase>
      ) : body}
    </Paper>
  );
};

const SmartSearchPane = ({ search, isText = false, onSeek, onOpenPage }) => {
  // What is typed, before it is searched. Seeded from the last search so coming
  // back to the tab shows the query that produced the list under it.
  const [value, setValue] = useState(search.query ?? "");
  const loading = search.status === statuses.loading;

  const submit = (e) => {
    e?.preventDefault();
    if (!value.trim() || loading) return;
    search.run(value);
  };

  const clear = () => {
    setValue("");
    search.reset();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0 }}>
      <Box component="form" onSubmit={submit} role="search">
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_QUERY_CHARS))}
          placeholder={`מה תרצה למצוא ב${isText ? "ספר" : "שיעור"}? למשל: מה נאמר על תשובה`}
          inputProps={{ "aria-label": "חיפוש בשיעור", maxLength: MAX_QUERY_CHARS }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {value && !loading && (
                  <IconButton size="small" onClick={clear} aria-label="נקה חיפוש">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" type="submit" disabled={!value.trim() || loading} aria-label="חפש">
                  {loading ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {search.status === statuses.failed && (
        <Alert severity="error">{hebrewForError(search.error, "החיפוש נכשל. נסה שוב.")}</Alert>
      )}

      {search.status === statuses.idle && (
        <Typography variant="body2" color="text.secondary">
          החיפוש מוצא קטעים לפי משמעות, לא רק לפי מילים מדויקות.
          {(onSeek || onOpenPage) && ` לחיצה על תוצאה ${onSeek ? "תנגן מאותו רגע" : "תפתח את העמוד"}.`}
        </Typography>
      )}

      {search.status === statuses.succeeded && search.results.length === 0 && (
        <Typography variant="body2" color="text.secondary" data-testid="search-empty">
          לא נמצאו קטעים מתאימים. אפשר לנסות לנסח אחרת, או לשאול במצב &quot;דיון עם בינה מלאכותית&quot;.
        </Typography>
      )}

      {search.results.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, opacity: loading ? 0.5 : 1 }} aria-busy={loading}>
          {search.results.map((hit) => (
            <ResultCard key={hit.id ?? hit.chunk_index} hit={hit} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SmartSearchPane;
