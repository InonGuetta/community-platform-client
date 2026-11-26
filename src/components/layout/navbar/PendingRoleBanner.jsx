import Alert from "@mui/material/Alert";
import { useTranslation } from "react-i18next";
import { useAccount } from "./useAccount";
import { roleLabels, roles } from "../../../utilities/constant";

// "Your request is still waiting."
//
// This is the visible half of a deliberate decision: somebody who applied to be
// a lecturer or an admin is signed in and USING the platform while they wait,
// with student permissions, rather than being locked out until an admin gets
// round to them.
//
// Locking them out would have been simpler and is worse. It produces an account
// that can do nothing, with no explanation, for an unbounded time — which reads
// as a broken signup rather than a pending step, and student permissions are not
// dangerous in the first place. The banner is what makes the difference between
// "waiting" and "broken": without it the user is simply in the wrong place with
// no idea why.
//
// It also covers the refusal. Somebody whose application was declined gets a
// one-line answer here rather than only in an email they may not read.

const PendingRoleBanner = () => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  const { user } = useAccount();
  const { t } = useTranslation("nav");

  const status = user?.approval_status;
  const requested = user?.requested_role;

  // Nothing to say for the overwhelming majority: an approved account, and one
  // that never asked for anything beyond student.
  if (!requested || requested === roles.student) return null;
  if (status !== "pending" && status !== "rejected") return null;

  const roleName = roleLabels[requested] || requested;

  if (status === "pending") {
    return (
      <Alert severity="info" square sx={{ borderRadius: 0 }}>
        {t("roleBanner.pending", { role: roleName })}
      </Alert>
    );
  }

  return (
    <Alert severity="warning" square sx={{ borderRadius: 0 }}>
      {t("roleBanner.rejected", { role: roleName })}
    </Alert>
  );
};

export default PendingRoleBanner;
