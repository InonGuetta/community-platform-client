import SvgIcon from "@mui/material/SvgIcon";

// The dock's three glyphs, drawn as in the mockup (02-archive.html, `.dk`):
// stroked, 1.9 wide, round caps — none of MUI's icons is the same shape.
const stroked = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };

export const ArchiveDockIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <g {...stroked}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </g>
  </SvgIcon>
);

export const AskDockIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path {...stroked} d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
    <path fill="currentColor" d="M12 7l.9 2.6L15.5 10.5l-2.6.9L12 14l-.9-2.6L8.5 10.5l2.6-.9z" />
  </SvgIcon>
);

export const CoursesDockIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <g {...stroked}>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </g>
  </SvgIcon>
);

// The brand mark: a sound wave in a dark square (component 1).
export const BrandWaveIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" d="M5 9v6M9 5v14M13 8v8M17 4v16M21 10v4" />
  </SvgIcon>
);
