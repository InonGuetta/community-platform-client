import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import DirectionalIcon from "../../../components/features/DirectionalIcon/DirectionalIcon";
import MediaGrid from "../../features/MediaGrid/MediaGrid";
import { SAVED_SHELF } from "../../layout/personalShelves";
import { useTranslation } from "react-i18next";
import { usePlaylistPageController } from "./usePlaylistPageController";

// One saved list, opened from the cards on the saved-content page.
//
// A route of its own rather than an expanding panel there: a list is a place a
// user comes back to, and a place worth linking to has an address. It also means
// the page can be arrived at cold — which is why the server sends the list's
// TITLE with its rows (see getPlaylistWithMedia), rather than leaving the
// heading to be looked up from a store that may hold nothing yet.
//
// The grid is the archive's, like every other shelf: these are the same
// lectures, and one a user filed should look and behave exactly as it does where
// they found it.

const PlaylistPage = () => {
  const {
    failed,
    items,
    navigate,
    playlist,
    status,
    user,
  } = usePlaylistPageController();
  const { t } = useTranslation(["personal", "nav"]);

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default" }}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* "Back" by meaning: DirectionalIcon points it right in Hebrew and
            left in English. */}
        <Button
          onClick={() => navigate(SAVED_SHELF.path)}
          startIcon={<DirectionalIcon toward="back" />}
          sx={{ mb: 2, "& .MuiButton-startIcon": { marginInlineEnd: -0.25, marginInlineStart: 0.75 } }}
        >
          {t(`nav:${SAVED_SHELF.labelKey}`)}
        </Button>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          {/* The heading holds its place while the list loads, so the page does
              not jump once the title arrives. */}
          <Typography variant="h4" fontWeight={800} color="primary">
            {playlist?.title || t("list.fallbackTitle")}
          </Typography>
          {items.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {t("lessons", { count: items.length })}
            </Typography>
          )}
        </Box>

        {/* A failed load is told apart from an empty list on purpose: "הרשימה
            ריקה" under a request that never arrived sends the user looking for
            lectures they did not lose. */}
        {failed ? (
          <Alert severity="error">{t("list.loadFailed")}</Alert>
        ) : (
          <MediaGrid
            items={items}
            status={status}
            onView={(id) => navigate(`/media/${id}`)}
            user={user}
            emptyMessage={t("list.empty")}
            emptyActionLabel={t("toArchive")}
            onEmptyAction={() => navigate("/archive")}
          />
        )}
      </Box>
    </Box>
  );
};

export default PlaylistPage;
