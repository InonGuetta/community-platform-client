import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MediaGrid from "../../features/MediaGrid/MediaGrid";
import { statuses } from "../../../utilities/constant";
import { savedListPath } from "../../layout/personalShelves";
import { usePlaylistsSection } from "./usePlaylistsSection";
import { useTranslation } from "react-i18next";

// How many placeholder rows stand in while the lists load.
const PLACEHOLDER_ROWS = 3;

// One saved list, as a row that folds (D-36, mockups 07/28): the title in bold,
// the count in the mute colour, a chevron — and under it, once opened, the
// lectures in the same cards they appear in everywhere else. Closed by default,
// so a user with many lists sees all their names at once instead of a page of
// cards; each row opens by itself.
//
// The cards are the archive's MediaGrid: a lecture a user filed should look and
// behave exactly as it does where they found it — same menu, same badges, same
// click.
const PlaylistShelf = ({ playlist, user, onOpenList }) => {
  const { t } = useTranslation("personal");
  const panelId = useId();
  const [open, setOpen] = useState(false);
  // Newest first (ORDER BY added_at DESC); all that arrived is shown on opening.
  const items = playlist.items || [];

  // The server caps how many lectures ride along with a list. Past that the list
  // has a page of its own, which was built for exactly this.
  //
  // `item_count` counts what this viewer MAY SEE, not what the list holds — so
  // this compares like with like. Before that, a list holding lectures from a
  // course the viewer is not enrolled in offered "the whole list" and then
  // opened a page showing exactly the same cards.
  const beyondWhatArrived = playlist.item_count > items.length;

  return (
    <Box sx={{ mt: 4 }}>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          py: 1.5,
          textAlign: "start",
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", minWidth: 0 }}>
          <Typography variant="display" component="span" dir="auto" sx={{ fontSize: 24, overflowWrap: "anywhere" }}>
            {playlist.title}
          </Typography>
          <Typography component="span" sx={{ fontSize: 14, color: "text.secondary" }}>
            {t("lessons", { count: Number(playlist.item_count) || 0 })}
          </Typography>
        </Box>
        <KeyboardArrowDownRoundedIcon
          aria-hidden
          sx={{ flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </ButtonBase>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }} />

      <Collapse in={open} unmountOnExit id={panelId}>
        <Box sx={{ pt: 3 }}>
          {/* Offered only when there is something here it cannot show. A link to
              "the whole list" beside a list that is already whole is a question
              the reader has to answer for nothing. */}
          {beyondWhatArrived && (
            <Button size="small" onClick={onOpenList} sx={{ mb: 2 }}>
              {t("fullList")}
            </Button>
          )}
          {items.length === 0 ? (
            // Either genuinely empty, or holding only lectures this viewer may
            // not see — the server applies the same visibility rule here as
            // everywhere. Both are "nothing to show you", and neither is an error.
            <Typography variant="body2" color="text.disabled">
              {t("emptyList")}
            </Typography>
          ) : (
            <MediaGrid items={items} status={statuses.succeeded} user={user} />
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

// Layout only: what the section loads is usePlaylistsSection's.
const PlaylistsSection = () => {
  const { t } = useTranslation("personal");
  const navigate = useNavigate();
  const { playlists, status, user, loading } = usePlaylistsSection();

  return (
    <Box sx={{ mt: { xs: 8, md: 10 } }}>
      <Typography variant="display" component="h2" sx={{ fontSize: 32 }}>
        {t("lists.title")}
      </Typography>

      {status === statuses.failed ? (
        <Alert severity="error" sx={{ mt: 3 }}>{t("lists.loadFailed")}</Alert>
      ) : loading ? (
        <Box sx={{ mt: 3, display: "grid", gap: 2 }}>
          {Array.from({ length: PLACEHOLDER_ROWS }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
        </Box>
      ) : playlists.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t("lists.none")}
        </Typography>
      ) : (
        playlists.map((playlist) => (
          <PlaylistShelf
            key={playlist.id}
            playlist={playlist}
            user={user}
            onOpenList={() => navigate(savedListPath(playlist.id))}
          />
        ))
      )}
    </Box>
  );
};

export default PlaylistsSection;
