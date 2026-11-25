import { createContext } from "react";

// "תצוגת מנהל" (design/REDESIGN_V4.md, component 2; D-07): whether the
// management controls are on screen. A DISPLAY preference, per browser — never a
// permission: the server enforces exactly what it did before, and the admin
// pages stay reachable by URL with the switch off.
//
// On by default, so nothing disappears for anyone the day this ships. Kept in
// localStorage, wrapped, because storage can throw (blocked site data, an old
// private mode) — then the switch simply starts on and is forgotten on reload.
const STORAGE_KEY = "adminView";

export const readAdminView = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

export const saveAdminView = (enabled) => {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Not saved — the choice still holds for this visit.
  }
};

// App provides the real value. The default is "on" with a no-op toggle, so a
// component rendered outside the provider (a unit test of one page) shows what
// it showed before the switch existed.
export const AdminViewContext = createContext({ enabled: true, toggle: () => {} });
