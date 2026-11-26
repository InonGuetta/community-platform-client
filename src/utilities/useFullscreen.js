import { useEffect, useState } from "react";

// Full screen through the browser's Fullscreen API — what F11 does, from a
// button. `targetRef` is the element to fill the screen with (a video's stage);
// without one, the whole page.
//
//   supported — false where the browser offers no element full screen (an
//               iPhone's Safari): the caller then shows no button at all.
//   active    — whether THIS target is the one on the screen now. For the page
//               that is any element being full screen, since the page holds
//               them all. A full screen entered with F11 is the browser's own
//               and is not reported here; Esc or F11 leaves it as always.
//   toggle    — in or out. A refusal (no user gesture, a policy) is swallowed:
//               nothing changes, and there is nothing to tell the reader.
const fullscreenElement = () => (typeof document === "undefined" ? null : document.fullscreenElement ?? null);

export const useFullscreen = (targetRef = null) => {
  // Whether the target is on the screen, worked out when the browser says the
  // full screen changed — a ref is read in that handler, never while rendering.
  const [active, setActive] = useState(() => !targetRef && Boolean(fullscreenElement()));

  useEffect(() => {
    const onChange = () => {
      const element = fullscreenElement();
      setActive(targetRef ? Boolean(element) && element === targetRef.current : Boolean(element));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [targetRef]);

  const supported = typeof document !== "undefined" && Boolean(document.fullscreenEnabled);

  const toggle = () => {
    if (!supported) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    const target = targetRef ? targetRef.current : document.documentElement;
    target?.requestFullscreen?.().catch(() => {});
  };

  return { supported, active, toggle };
};
