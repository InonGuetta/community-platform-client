import { useEffect, useRef, useState } from "react";

// UI_UX_FIXES 2.2: the dock gets out of the way while the reader scrolls down
// (on a phone it sat on the "new note" button and the player) and comes back on
// the first scroll up. It is always there at the top of the page and at the
// bottom of it, and it comes back when a route changes.

// Below this the page counts as "at the top".
const TOP_ZONE = 10;
// Within this of the end the page counts as "at the bottom".
const BOTTOM_ZONE = 8;
// A scroll smaller than this is jitter (momentum, a layout shift), not intent.
const MIN_DELTA = 4;

export const useDockVisibility = (resetKey) => {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    setVisible(true);
  }, [resetKey]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const doc = document.documentElement;
      const atBottom = window.innerHeight + y >= doc.scrollHeight - BOTTOM_ZONE;
      if (y <= TOP_ZONE || atBottom) {
        setVisible(true);
      } else if (y - lastY.current > MIN_DELTA) {
        setVisible(false);
      } else if (lastY.current - y > MIN_DELTA) {
        setVisible(true);
      } else {
        return;
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
};
