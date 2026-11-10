import { useEffect, useRef } from "react";

// Infinite scroll for the archive (PRD ARCH-1): a ref for an element at the
// foot of the list, and a call to `onLoadMore` whenever it comes within
// `margin` of the viewport. The margin is what makes it feel infinite — the next
// page is asked for while the reader still has a screen of cards to go.
//
// Calling onLoadMore more than once is harmless by design: the thunk behind it
// does nothing at the end of the list or while a page is already on its way.
//
// No IntersectionObserver (an old browser, the test environment) means no
// automatic loading — the grid's "טעינת עוד" button is always there as well,
// and is also the keyboard user's way down the list.
const useLoadMoreTrigger = (onLoadMore, { enabled, margin = "600px" }) => {
  const ref = useRef(null);
  // The latest callback, without re-subscribing the observer on every render.
  // Updated in an effect: a ref is not written during render.
  const callback = useRef(onLoadMore);
  useEffect(() => {
    callback.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current?.();
      },
      { rootMargin: `0px 0px ${margin} 0px` }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, margin]);

  return ref;
};

export default useLoadMoreTrigger;
