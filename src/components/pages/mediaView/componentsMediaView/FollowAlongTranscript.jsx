import { memo, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { cueIndexAt } from "../../../../utilities/transcriptTiming";
import { formatTime } from "../../../../utilities/formatTime";

// The transcript as the lesson plays (PRD MOB-6): the sentence being said is
// highlighted and kept in view, and pressing any sentence plays from there.
//
// The cues are the player's captions (utilities/transcriptTiming), so the
// highlighted line and the caption over the stage are always the same words.

// How long after the reader scrolls by hand the transcript stays where they put
// it, before it goes back to following the lesson.
const MANUAL_SCROLL_HOLD_MS = 5000;

// The nearest ancestor that actually scrolls. On a phone the panel grows with
// its content and nothing inside it scrolls — and then the transcript does not
// either, rather than dragging the whole page along with the lesson.
const scrollParentOf = (el) => {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
};

// One sentence. Memoised so a tick of the player redraws only the two
// sentences whose highlight changed, not every sentence of a two-hour lesson.
const Cue = memo(({ cue, index, active, onSeek }) => (
  <Box
    component="span"
    role="button"
    tabIndex={0}
    data-cue={index}
    aria-current={active ? "true" : undefined}
    title={formatTime(cue.start)}
    onClick={() => onSeek?.(cue.start)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSeek?.(cue.start);
      }
    }}
    sx={{
      cursor: "pointer",
      borderRadius: 0.5,
      px: 0.25,
      transition: "background-color 200ms ease",
      bgcolor: active ? "secondary.light" : "transparent",
      color: active ? "secondary.contrastText" : "text.primary",
      "&:hover": { bgcolor: active ? "secondary.light" : "action.hover" },
      "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main" },
    }}
  >
    {cue.text}{" "}
  </Box>
));
Cue.displayName = "Cue";

const FollowAlongTranscript = ({ captions, currentTime, onSeek }) => {
  const containerRef = useRef(null);
  const manualUntil = useRef(0);
  const { cues, precise } = captions;
  const active = cueIndexAt(cues, currentTime);

  // Scrolling by hand pauses the following, so a reader can look back without
  // being pulled away every second.
  useEffect(() => {
    const parent = scrollParentOf(containerRef.current);
    if (!parent) return undefined;
    const hold = () => { manualUntil.current = Date.now() + MANUAL_SCROLL_HOLD_MS; };
    parent.addEventListener("wheel", hold, { passive: true });
    parent.addEventListener("touchmove", hold, { passive: true });
    return () => {
      parent.removeEventListener("wheel", hold);
      parent.removeEventListener("touchmove", hold);
    };
  }, []);

  useEffect(() => {
    if (active === null || Date.now() < manualUntil.current) return;
    const el = containerRef.current?.querySelector(`[data-cue="${active}"]`);
    const parent = scrollParentOf(containerRef.current);
    if (!el || !parent) return;
    const offset = el.getBoundingClientRect().top - parent.getBoundingClientRect().top;
    // A third of the way down: the sentence being said, with what comes next
    // under it.
    parent.scrollTo?.({ top: parent.scrollTop + offset - parent.clientHeight / 3, behavior: "smooth" });
  }, [active]);

  const jumpToNow = () => {
    manualUntil.current = 0;
    containerRef.current?.querySelector(`[data-cue="${active}"]`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  };

  return (
    <Box ref={containerRef}>
      {!precise && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
          התזמון בשיעור הזה משוער, ולכן המשפט המודגש עשוי להקדים או לאחר בכמה שניות.
        </Typography>
      )}
      {active !== null && (
        <Box sx={{ position: "sticky", top: 0, zIndex: 1, display: "flex", justifyContent: "flex-end", pointerEvents: "none" }}>
          <Button size="small" variant="outlined" onClick={jumpToNow} sx={{ pointerEvents: "auto", bgcolor: "background.paper", borderRadius: 999 }}>
            למקום שמתנגן
          </Button>
        </Box>
      )}
      <Typography component="div" sx={{ lineHeight: 2, textAlign: "start", whiteSpace: "normal" }}>
        {cues.map((cue, index) => (
          <Cue key={index} cue={cue} index={index} active={index === active} onSeek={onSeek} />
        ))}
      </Typography>
    </Box>
  );
};

export default FollowAlongTranscript;
