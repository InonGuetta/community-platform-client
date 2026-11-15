import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { authApi } from "../../../api/authApi";
import { GoogleIcon, AppleIcon, LinkedInIcon, socialButtonSx } from "./authShared";

// "Continue with a provider", for the sign-in and sign-up screens alike — the
// provider decides whether the account is new, so the two screens differ only
// in the verb.
//
// Ordered by how widely each is used to sign in: Google, then Apple, then
// LinkedIn. Each is a full-page navigation, not a request: the browser goes to
// the provider and comes back through the server (see authApi).
const PROVIDERS = [
  { name: "Google", url: authApi.googleLoginUrl, Icon: GoogleIcon },
  { name: "Apple", url: authApi.appleLoginUrl, Icon: AppleIcon },
  { name: "LinkedIn", url: authApi.linkedinLoginUrl, Icon: LinkedInIcon },
];

// The icon is pinned to the same spot at the start edge of every button, and
// the label is centred on its own. Left beside the label (MUI's default), each
// icon sat wherever its label happened to begin, so three labels of different
// lengths put the three icons in a ragged column. Inline-start, not `right`:
// the page is RTL, and the logical property keeps that true either way. The
// padding keeps a long label from running under the icon.
const buttonSx = {
  ...socialButtonSx,
  position: "relative",
  px: 6,
  "& .MuiButton-startIcon": {
    position: "absolute",
    insetInlineStart: 20,
    top: "50%",
    transform: "translateY(-50%)",
    margin: 0,
    display: "flex",
  },
};

/** @param {{ verb: string }} props  "התחבר" or "הירשם" */
const SocialSignIn = ({ verb }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
    {PROVIDERS.map(({ name, url, Icon }) => (
      <Button key={name} variant="outlined" fullWidth startIcon={<Icon />}
        onClick={() => { window.location.href = url; }}
        sx={buttonSx}
      >
        {verb} באמצעות {name}
      </Button>
    ))}
  </Box>
);

export default SocialSignIn;
