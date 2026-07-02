import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { searchTranscripts } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import { clearSearchResults } from "../../../store/slicesAndThunks/transcriptSlice/transcriptSlice";
import { selectSearchResults } from "../../../store/selectors/transcriptSelectors";
import { formatTime } from "../../../utilities/formatTime";

// ts_headline returns the snippet with <b>…</b> around matches; render as plain
// text to avoid injecting transcript-derived HTML into the DOM.
const stripTags = (s = "") => s.replace(/<[^>]+>/g, "");

// Colour each result by the ACTUAL relevance the server returns (0–1). In
// hybrid mode this is GPT-4o's rerank score — a meaningful, calibrated judgment
// of how well the segment matches the query's meaning (not raw cosine, which
// sits in a narrow band). So a query with only weak matches shows no green.
const STRONG_THRESHOLD = 0.7; // green  — clearly on-topic
const MEDIUM_THRESHOLD = 0.4; // amber  — partially relevant

const tierOf = (sim) => {
  const s = Number(sim);
  if (!Number.isFinite(s)) return "normal";
  if (s >= STRONG_THRESHOLD) return "strong";
  if (s >= MEDIUM_THRESHOLD) return "medium";
  return "normal";
};
const TITLE_COLOR = { strong: "success.main", medium: "#b8860b", normal: "text.primary" };
const BORDER_COLOR = { strong: "success.main", medium: "#b8860b", normal: "transparent" };

// "Smart deep search" over transcripts: hybrid (meaning + keyword). Fires on
// Enter / the search button — NOT per keystroke, since each query embeds the
// text via OpenAI on the server. Clicking a result jumps to the player at the
// matching segment's start_time (onOpenResult is wired by the page).
const SmartSearch = ({ onOpenResult }) => {
  const dispatch = useDispatch();
  const results = useSelector(selectSearchResults);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    // Guard against overlapping searches: a search runs an embedding + a GPT-4o
    // rerank (a few seconds). Without this, a second Enter mid-search could let
    // the older (slower) request resolve last and overwrite the newer results.
    if (loading) return;
    const q = value.trim();
    if (!q) {
      dispatch(clearSearchResults());
      setSearched(false);
      return;
    }
    setLoading(true);
    await dispatch(searchTranscripts({ q, mode: "hybrid" }));
    setLoading(false);
    setSearched(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") runSearch();
  };

  return (
    <Box>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="smart deep search"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={runSearch} edge="end" aria-label="search" disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <SearchIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && searched && results.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          לא נמצאו תוצאות תואמות.
        </Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {!loading &&
          results.map((r) => {
            const tier = tierOf(r.similarity);
            return (
            <Paper
              key={`${r.media_id}-${r.chunk_index}`}
              onClick={() => onOpenResult(r.media_id, r.start_time)}
              sx={{
                p: 2,
                cursor: "pointer",
                borderLeft: "4px solid",
                borderLeftColor: BORDER_COLOR[tier],
                transition: "box-shadow 0.15s, transform 0.15s",
                "&:hover": { boxShadow: 4, transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5, gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} color={TITLE_COLOR[tier]} noWrap>
                  {r.media_title}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                  {/* TEMP (calibration): the rerank relevance score, shown so we
                      can verify the colour thresholds against real values. Decide
                      whether to keep as a "match %" feature or remove. */}
                  {Number.isFinite(Number(r.similarity)) && (
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(Number(r.similarity) * 100)}%
                    </Typography>
                  )}
                  <Chip
                    icon={<PlayArrowIcon />}
                    label={formatTime(r.start_time)}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {stripTags(r.headline)}
              </Typography>
            </Paper>
            );
          })}
      </Box>
    </Box>
  );
};

export default SmartSearch;
