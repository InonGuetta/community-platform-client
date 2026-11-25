import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import { useTranslation } from "react-i18next";
import DownloadMenu from "../DownloadMenu/DownloadMenu";
import { useDirection, menuOrigins } from "../../../i18n/useDirection";

// The menus behind a tile's ⋯ button (component 5): the actions, in the spec's
// order, styled like the avatar menu (component 2) by the theme; and the
// download menu that "הורדה" opens in its place (D-16).
//
// Rendered OUTSIDE the tile's clickable body (see MediaTile): React bubbles a
// portal's events through the component tree, so a menu inside the body would
// open the lesson on every click in it — the backdrop included.
const MediaTileMenu = ({ item, menu }) => {
  const { t } = useTranslation("media");
  const { end } = useDirection();
  const { actions } = menu;
  const before = actions.download || actions.edit || actions.tags || actions.publish;
  const published = Boolean(item.is_published);

  return (
    <>
      <Menu
        anchorEl={menu.anchor}
        open={menu.open}
        onClose={menu.closeMenu}
        {...menuOrigins(end)}
        slotProps={{ paper: { sx: { width: 240, maxWidth: "calc(100vw - 24px)", mt: 0.5 } } }}
      >
        {actions.download && <MenuItem onClick={menu.openDownload} aria-haspopup="menu">{t("card.download")}</MenuItem>}
        {actions.edit && <MenuItem onClick={menu.editDetails}>{t("card.editDetails")}</MenuItem>}
        {actions.tags && <MenuItem onClick={menu.editTags}>{t("card.editTags")}</MenuItem>}
        {actions.publish && (
          <MenuItem onClick={menu.togglePublish} disabled={menu.publishing} sx={{ flexDirection: "column", alignItems: "flex-start", gap: 0.25 }}>
            <Box component="span">{published ? t("card.hide") : t("card.publish")}</Box>
            <Box component="span" sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "normal" }}>
              {published ? t("card.publishedHint") : t("card.draftHint")}
            </Box>
          </MenuItem>
        )}
        {actions.delete && before && <Divider sx={{ my: 0.5 }} />}
        {actions.delete && (
          <MenuItem onClick={menu.requestDelete} sx={{ color: "surface.danger", fontWeight: 600 }}>
            {t("card.delete")}
          </MenuItem>
        )}
      </Menu>

      {/* `hasTranscript` rather than a transcript: the list carries the flag,
          and the text is fetched only if the PDF is actually chosen. */}
      <DownloadMenu
        anchorEl={menu.downloadAnchor}
        open={Boolean(menu.downloadAnchor)}
        onClose={menu.closeDownload}
        media={item}
        hasTranscript={item.has_transcript}
        direction="down"
      />
    </>
  );
};

export default MediaTileMenu;
