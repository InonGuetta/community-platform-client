// The bottom player (D-145). Optional chaining on the slice: a test store built
// for one page leaves it out, and a missing bar is simply a closed one.
export const selectNowPlayingItem = (state) => state.nowPlaying?.item ?? null;
export const selectNowPlayingHandover = (state) => state.nowPlaying?.handover ?? null;
