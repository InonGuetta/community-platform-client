// The shape of a video stage, stated once as two numbers so the CSS string and
// the arithmetic below cannot come to describe different ratios.
const STAGE_WIDTH = 16;
const STAGE_HEIGHT = 9;

export const STAGE_ASPECT = `${STAGE_WIDTH} / ${STAGE_HEIGHT}`;

/**
 * How tall a stage is at a given width — the height a video occupies, and
 * therefore the height a lecture's block USED to occupy whatever its type.
 *
 * The media page needs this: audio no longer renders a stage, so its block is a
 * ~50px control bar, and the side panel that matches the block's height would
 * collapse to nothing behind it. The panel asks this what the block would have
 * been and never goes below it, which keeps the page looking as it did when
 * every lecture was given a black rectangle whether it had a picture or not.
 *
 * A module of its own rather than an export of MediaPlayer, because that is what
 * the two callers actually share. Hanging it off the component meant that every
 * test replacing the player with a stub also had to remember to re-export a
 * geometry function it has nothing to do with — and the first one that forgot
 * failed with an error about mocks rather than about layout.
 */
export const stageHeightForWidth = (width) => ((width || 0) * STAGE_HEIGHT) / STAGE_WIDTH;
