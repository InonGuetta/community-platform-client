// Installing the app (PRD MOB-1).
//
// A browser that considers the page installable fires `beforeinstallprompt`
// once, early — often before React has mounted anything to hear it. So this
// module listens from the moment it is imported (main.jsx imports it first),
// keeps the event, and hands it to whichever part of the page asks later. The
// event is the ONLY way to open the browser's own install dialog, and it can be
// used once.
//
// iOS has no such event: installing there is Share → "הוספה למסך הבית", which
// no page can trigger. The menu item opens instructions there instead.

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the browser's own mini-infobar from appearing on its own schedule:
    // the app offers installing where a reader looks for it.
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export const canPromptInstall = () => deferred !== null;

export const subscribeInstall = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Opens the browser's dialog. Resolves to "accepted" or "dismissed" — or
// "unavailable" when there is no event to use.
export const promptInstall = async () => {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  return choice?.outcome ?? "dismissed";
};

// Already running as an installed app — nothing to offer.
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

// iPhone or iPad Safari, where only the instructions can help. iPadOS reports
// itself as a Mac, so a Mac with a touch screen counts as an iPad.
export const isIos = (nav = typeof navigator !== "undefined" ? navigator : undefined) => {
  if (!nav) return false;
  const ua = nav.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
};
