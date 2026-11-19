import ButtonBase from "@mui/material/ButtonBase";
import Box from "@mui/material/Box";
import { RADIUS, MOTION } from "../../../theme/tokens";

// A filter chip (component 9, `.chip`): a grey pill 36 high, 14/600; chosen,
// it turns ink with white text. A real <button>, so it is reached and pressed
// like one.
//
//   * `selected` — a toggle (the archive's type chips): drawn chosen and
//     announced with aria-pressed. Leave it undefined for a chip that is not a
//     toggle (the sort chip, the "סינון" chip — which passes aria-expanded and
//     `selected` for "drawn dark while its panel is open").
//   * `pressed` — false to draw it chosen without aria-pressed (that chip).
//   * `count` — a number inside the chip, in the muted tone (the spec's
//     "אפשר מונה בתוכו"). Nothing is drawn for 0.
//   * `endIcon` — a chevron for a chip that opens a menu.
const FilterChip = ({ label, selected, pressed = true, count = 0, endIcon = null, sx = [], ...rest }) => {
  const on = Boolean(selected);
  return (
    <ButtonBase
      {...(selected !== undefined && pressed && { "aria-pressed": on })}
      {...rest}
      sx={[
        {
          height: 36,
          px: 2,
          gap: 0.75,
          flexShrink: 0,
          borderRadius: `${RADIUS.pill}px`,
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: "nowrap",
          bgcolor: on ? "text.primary" : "surface.fill",
          color: on ? "background.default" : "text.primary",
          transition: "background-color .2s, color .2s, transform .1s",
          "&:hover": { bgcolor: on ? "text.primary" : "surface.fillHover" },
          "&:active": { transform: MOTION.press },
          "& svg": { fontSize: 16 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {label}
      {count > 0 && (
        <Box component="span" sx={{ fontWeight: 500, color: on ? "inherit" : "text.secondary", opacity: on ? 0.75 : 1 }}>
          {count}
        </Box>
      )}
      {endIcon}
    </ButtonBase>
  );
};

export default FilterChip;
