import Link from "@mui/material/Link";
import { Link as RouterLink } from "react-router-dom";
import DirectionalIcon from "../DirectionalIcon/DirectionalIcon";

// "› הארכיון" (component 16): a way back, 14px, 600, in the accent, with a
// chevron that points back in the reader's direction and leads the label. A
// route (`to`) renders a router link; `onClick` alone (history back) renders a
// button.
const BackLink = ({ to, onClick, children, sx = [] }) => {
  const routed = to != null;
  const target = routed ? { component: RouterLink, to } : { component: "button", type: "button" };
  return (
    <Link
      {...target}
      onClick={onClick}
      underline="hover"
      sx={[
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          fontSize: 14,
          fontWeight: 600,
          color: "primary.main",
          "& svg": { fontSize: 18 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <DirectionalIcon toward="back" shape="chevron" aria-hidden="true" />
      {children}
    </Link>
  );
};

export default BackLink;
