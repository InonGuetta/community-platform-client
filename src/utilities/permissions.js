import { roles } from "./constant";

// The client-side mirror of the server's lib/permissions.js. These two files
// answer the same two questions and must give the same answers: this one decides
// what to RENDER, the server one decides what to ALLOW. When they disagree the
// user sees a control that fails on press — which is exactly the bug this file
// was extracted to stop, in both directions (a hidden button they were entitled
// to, or a visible one the server refuses).
//
// Before this existed the `lecturer || admin` test was written out by hand in
// four components, so a change to the rule meant finding all four.

// May see unpublished material and reach the management controls at all.
export const isPrivileged = (user) =>
  user?.role === roles.lecturer || user?.role === roles.admin;

// May change THIS item. An admin manages the whole library; a lecturer manages
// only what they uploaded. Numeric comparison rather than === because ids that
// have been through JSON arrive as strings often enough to matter.
export const canManageMedia = (user, item) => {
  if (user?.role === roles.admin) return true;
  if (user?.role !== roles.lecturer) return false;
  const owner = Number(item?.uploader_id);
  const caller = Number(user?.id);
  return Number.isInteger(owner) && Number.isInteger(caller) && owner === caller;
};
