import Box from "@mui/material/Box";
import FilterChip from "../../features/FilterChip/FilterChip";
import { HEADER_HEIGHT } from "../../layout/shellGeometry";
import { useTranslation } from "react-i18next";

// The profile is one long column of cards; this strip sticks under the site
// header and jumps to the four that matter (UI_UX_FIXES 4.11). Each entry is a
// real link to its section's id, so it works without the script too; the click
// scrolls smoothly (instantly under reduced motion) and leaves the URL alone.
export const PROFILE_SECTIONS = [
  { id: "profile-details", key: "details" },
  { id: "profile-phone", key: "phone" },
  { id: "profile-notifications", key: "notifications" },
  { id: "profile-password", key: "password" },
];

// Clears the site header and the strip itself when a section is scrolled to.
export const SECTION_SCROLL_MARGIN = HEADER_HEIGHT + 64;

const goTo = (event, id) => {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
};

const ProfileSectionNav = () => {
  const { t } = useTranslation("profile");
  return (
    <Box
      component="nav"
      aria-label={t("nav.label")}
      sx={{
        position: "sticky",
        top: HEADER_HEIGHT,
        zIndex: 2,
        display: "flex",
        gap: 1,
        overflowX: "auto",
        // The page's own colour behind the chips, so the cards scrolling up
        // under the strip do not show through.
        bgcolor: "background.default",
        py: 1.5,
        mb: 2,
      }}
    >
      {PROFILE_SECTIONS.map(({ id, key }) => (
        <FilterChip key={id} component="a" href={`#${id}`} label={t(`nav.${key}`)} onClick={(event) => goTo(event, id)} />
      ))}
    </Box>
  );
};

export default ProfileSectionNav;
