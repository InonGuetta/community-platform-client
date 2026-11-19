import { useId } from "react";
import Box from "@mui/material/Box";
import { paletteFor, coverKindFor, AUDIO_RINGS, AUDIO_BARS } from "../../../utilities/coverArt";

// An item's square cover (component 5): the picture somebody uploaded, or else
// a generated one — a gradient in the item's own palette (chosen by its id, so
// it never changes; D-19) with the shape of its type: a sound wave, a book, a
// screen. Artwork, not text, so it is not mirrored in a left-to-right language.
//
// Fills its parent, which sets the size and the corners.

const fill = { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" };

const Shapes = ({ kind, fg }) => {
  if (kind === "audio") {
    return (
      <>
        {AUDIO_RINGS.map(({ r, opacity }) => (
          <circle key={r} cx="-10" cy="110" r={r} fill="none" stroke={fg} strokeOpacity={opacity} strokeWidth="1.6" />
        ))}
        <g fill={fg} fillOpacity=".92">
          {AUDIO_BARS.map(({ x, y, h }) => (
            <rect key={x} x={x} y={y} width="7" height={h} rx="3.5" />
          ))}
        </g>
      </>
    );
  }
  if (kind === "video") {
    return (
      <>
        <rect x="34" y="52" width="132" height="96" rx="10" fill="none" stroke={fg} strokeOpacity=".8" strokeWidth="1.6" />
        <path d="M90 76l32 24-32 24z" fill={fg} />
      </>
    );
  }
  return (
    <>
      <g fill="none" stroke={fg} strokeOpacity=".85" strokeWidth="1.6">
        <rect x="46" y="38" width="108" height="124" rx="5" />
        <path d="M62 38v124" />
      </g>
      <g stroke={fg} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round">
        <path d="M76 66h62M76 82h62M76 98h40" />
      </g>
    </>
  );
};

const CoverArt = ({ item }) => {
  // One gradient id per cover: two covers on a page with the same id would
  // both paint with whichever gradient the document defined first. useId's
  // colons are legal in an id but not inside url(#…) everywhere, so they go.
  const gradientId = `cover${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (item.thumbnail_url) {
    // Decorative: the tile is named by the title beside it.
    return <Box component="img" src={item.thumbnail_url} alt="" sx={{ ...fill, objectFit: "cover" }} />;
  }

  const [start, end, fg] = paletteFor(item.id);
  return (
    <Box component="svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-testid="cover-art" sx={fill}>
      <defs>
        <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={start} />
          <stop offset="1" stopColor={end} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gradientId})`} />
      <Shapes kind={coverKindFor(item.media_type)} fg={fg} />
    </Box>
  );
};

export default CoverArt;
