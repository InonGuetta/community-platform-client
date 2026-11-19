import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InboxIcon from "@mui/icons-material/Inbox";
import { RADIUS } from "../../../theme/tokens";

// The empty state (component 14): a dashed panel, an icon on a soft accent
// tile, a display title, an optional line of text and an optional primary
// action. Every empty list in the app is one of these — NoDataDialog renders
// it for the callers that predate it (D-30).
//
// `action` is { label, onClick } for the usual button, or any node for
// something else (a link, two buttons).
const isButtonAction = (action) => action && typeof action === "object" && "label" in action && "onClick" in action;

const EmptyState = ({ icon: Icon = InboxIcon, title, text, action = null, titleComponent = "h2", sx = [] }) => (
  <Box
    sx={[
      {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 2,
        borderRadius: `${RADIUS.hero}px`,
        border: "2px dashed",
        borderColor: "surface.lineStrong",
        bgcolor: "surface.wash",
        px: 3,
        py: { xs: 8, md: 10 },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Box
      aria-hidden="true"
      sx={{
        width: 64,
        height: 64,
        borderRadius: `${RADIUS.emptyIcon}px`,
        bgcolor: "surface.accentSoft",
        color: "primary.main",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 1,
      }}
    >
      <Icon sx={{ fontSize: 32 }} />
    </Box>
    <Typography variant="display" component={titleComponent} sx={{ fontSize: { xs: 26, md: 32 } }}>
      {title}
    </Typography>
    {text && <Typography sx={{ fontSize: 16, color: "text.secondary", maxWidth: 448 }}>{text}</Typography>}
    {action && (
      <Box sx={{ mt: 1 }}>
        {isButtonAction(action) ? (
          <Button variant="contained" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : (
          action
        )}
      </Box>
    )}
  </Box>
);

export default EmptyState;
