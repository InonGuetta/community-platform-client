import { useEffect, useRef, useState } from "react";
import { HEADER_HEIGHT } from "../../../layout/shellGeometry";

// Whether a sticky band is stuck under the header (UI_UX_FIXES 3.4). A 1px
// sentinel sits in the flow just before the band; when the page has scrolled
// far enough that the sentinel has gone up behind the header, the band is
// pinned. Without IntersectionObserver (old browsers, jsdom) it is never
// reported stuck, and the band simply has no edge shadow.
export const useStuckBand = () => {
  const sentinelRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < HEADER_HEIGHT),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`, threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, stuck };
};
