import { logger } from "./logger";

// Registers public/sw.js, which keeps the app itself so it opens with no
// network (PRD MOB-2). Production builds only: under the dev server the worker
// would cache files Vite rewrites on every save, and a page served from a stale
// cache is the one bug nobody thinks to look for.
//
// After `load`, so installing the worker — which downloads the app's files
// again to cache them — does not compete with the first visit for bandwidth.
export const registerServiceWorker = ({
  enabled = import.meta.env.PROD,
  nav = typeof navigator !== "undefined" ? navigator : undefined,
  win = typeof window !== "undefined" ? window : undefined,
} = {}) => {
  if (!enabled || !nav?.serviceWorker || !win) return false;
  win.addEventListener("load", () => {
    nav.serviceWorker.register("/sw.js").catch((err) => {
      logger.warn("[sw] registration failed:", err?.message);
    });
  });
  return true;
};
