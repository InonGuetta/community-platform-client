import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import WbTwilightRoundedIcon from "@mui/icons-material/WbTwilightRounded";
import BedtimeRoundedIcon from "@mui/icons-material/BedtimeRounded";
import { Trans, useTranslation } from "react-i18next";
import { useDirection } from "../../../../i18n/useDirection";
import { useGreeting } from "./useGreeting";

// "בוקר טוב, דנה" / "Good evening, Dana" — the part of the day on the reader's
// clock, in the interface language, with the display name as they wrote it
// (<bdi>: a Hebrew name in an English sentence keeps its own direction).
//
// Large, in the brand's navy-to-teal (the colours of the upload button beside
// it), with the part of the day drawn beside it: a rising sun, the midday sun,
// a sunset, the moon.

const PARTS = {
  morning: { Icon: WbSunnyRoundedIcon, tint: "#f5a623" },
  afternoon: { Icon: LightModeRoundedIcon, tint: "#f08a24" },
  evening: { Icon: WbTwilightRoundedIcon, tint: "#8e6fd8" },
  night: { Icon: BedtimeRoundedIcon, tint: "#4a6fd1" },
};

const ArchiveGreeting = ({ name }) => {
  const { t } = useTranslation("archive");
  const { rtl } = useDirection();
  const part = useGreeting();
  const greeting = t(`greeting.${part}`);
  const { Icon, tint } = PARTS[part];

  return (
    <Box
      sx={{
        flex: "1 1 auto",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: { xs: "flex-start", md: "center" },
        gap: { xs: 1.25, md: 1.75 },
        animation: "greeting-in 700ms ease-out both",
        "@keyframes greeting-in": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "none" },
        },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          width: { xs: 42, md: 54 },
          height: { xs: 42, md: 54 },
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: tint,
          bgcolor: alpha(tint, 0.14),
          boxShadow: `0 6px 18px ${alpha(tint, 0.28)}`,
        }}
      >
        <Icon sx={{ fontSize: { xs: 26, md: 32 } }} />
      </Box>

      <Typography
        component="p"
        sx={(theme) => ({
          fontSize: { xs: "1.6rem", sm: "1.9rem", md: "2.15rem" },
          fontWeight: 800,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          overflowWrap: "anywhere",
          // The gradient runs the way the sentence reads: navy where it starts.
          backgroundImage: `linear-gradient(${rtl ? "270deg" : "90deg"}, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        })}
      >
        {name ? (
          <Trans t={t} i18nKey="greeting.named" values={{ greeting, name }} components={{ name: <bdi /> }} />
        ) : (
          greeting
        )}
      </Typography>
    </Box>
  );
};

export default ArchiveGreeting;
