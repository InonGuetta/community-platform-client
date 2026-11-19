import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { authApi } from "../../../api/authApi";
import { GoogleIcon, AppleIcon, LinkedInIcon } from "./authShared";
import { useTranslation } from "react-i18next";

// "Continue with a provider", for the sign-in and sign-up screens alike — the
// provider decides whether the account is new, so the two screens differ only
// in the verb. Only the providers the server has: no new ones come with the
// redesign.
//
// Ordered by how widely each is used to sign in: Google, then Apple, then
// LinkedIn. Each is a full-page navigation, not a request: the browser goes to
// the provider and comes back through the server (see authApi).
const PROVIDERS = [
  { name: "Google", url: authApi.googleLoginUrl, Icon: GoogleIcon },
  { name: "Apple", url: authApi.appleLoginUrl, Icon: AppleIcon },
  { name: "LinkedIn", url: authApi.linkedinLoginUrl, Icon: LinkedInIcon },
];

/** @param {{ mode: "signIn" | "signUp" }} props */
const SocialSignIn = ({ mode }) => {
  const { t } = useTranslation("auth");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {PROVIDERS.map(({ name, url, Icon }) => (
        <Button
          key={name}
          variant="outlined"
          fullWidth
          startIcon={<Icon />}
          onClick={() => { window.location.href = url; }}
          sx={{ minHeight: 48, gap: 0.5 }}
        >
          {t(`social.${mode}`, { name })}
        </Button>
      ))}
    </Box>
  );
};

export default SocialSignIn;
