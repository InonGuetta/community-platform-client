// Draws the app's icons (PRD MOB-1) into public/icons/ — run it from the client
// package, `node scripts/generate-icons.mjs`, after changing the design below.
//
// No image library: the design is a few polygons, so it is drawn pixel by
// pixel and written as PNG with Node's own zlib. Each pixel is sampled 4×4 and
// averaged, which is what keeps the edges smooth at 32px as well as at 512px.
//
// The design — an open book on the brand navy, with the teal bookmark ribbon —
// uses theme.js's two brand colours. favicon.svg is the same drawing in vector,
// for the browser tab.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const NAVY = [0x1a, 0x4a, 0x66];
const WHITE = [0xff, 0xff, 0xff];
const TEAL = [0x17, 0xa2, 0xc4];

// The drawing, in a 0..1 square. Pages slant up toward their outer edges, the
// way an open book looks from the front; a hairline gap is the spine.
const LEFT_PAGE = [[0.49, 0.40], [0.22, 0.32], [0.22, 0.69], [0.49, 0.77]];
const RIGHT_PAGE = [[0.51, 0.40], [0.78, 0.32], [0.78, 0.69], [0.51, 0.77]];
// The ribbon hangs from the right page's top edge, with a V cut at its end.
const RIBBON = [[0.585, 0.355], [0.645, 0.335], [0.645, 0.60], [0.615, 0.57], [0.585, 0.60]];

const inside = (x, y, poly) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// Rounded-square background, or the whole square for a full-bleed icon.
const inBackground = (x, y, radius) => {
  if (radius === 0) return true;
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
};

// The colour at one point. `scale` shrinks the drawing toward the centre — a
// maskable icon must keep its content inside the middle 80%.
const colourAt = (x, y, { radius, scale }) => {
  if (!inBackground(x, y, radius)) return null;
  const u = 0.5 + (x - 0.5) / scale;
  const v = 0.5 + (y - 0.5) / scale;
  if (inside(u, v, RIBBON)) return TEAL;
  if (inside(u, v, LEFT_PAGE) || inside(u, v, RIGHT_PAGE)) return WHITE;
  return NAVY;
};

const SAMPLES = 4;

const render = (size, options) => {
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const c = colourAt((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size, options);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const i = (py * size + px) * 4;
      // Colour averaged over the covered samples; coverage is the alpha.
      pixels[i] = a ? Math.round(r / a) : 0;
      pixels[i + 1] = a ? Math.round(g / a) : 0;
      pixels[i + 2] = a ? Math.round(b / a) : 0;
      pixels[i + 3] = Math.round((a / (SAMPLES * SAMPLES)) * 255);
    }
  }
  return pixels;
};

// ── PNG, by hand ────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const png = (size, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each row is preceded by filter byte 0 (none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const ICONS = [
  // "any" purpose: rounded, the drawing at full size.
  { file: "icon-192.png", size: 192, radius: 0.22, scale: 1 },
  { file: "icon-512.png", size: 512, radius: 0.22, scale: 1 },
  // Maskable: full bleed — the launcher cuts its own shape — and the drawing
  // inside the safe zone, so no mask can clip the book.
  { file: "icon-maskable-512.png", size: 512, radius: 0, scale: 0.8 },
  // iOS draws its own rounded corners over a square image.
  { file: "apple-touch-icon.png", size: 180, radius: 0, scale: 0.9 },
  { file: "favicon-32.png", size: 32, radius: 0.18, scale: 1.08 },
];

for (const { file, size, radius, scale } of ICONS) {
  writeFileSync(`${OUT}${file}`, png(size, render(size, { radius, scale })));
}

const points = (poly) => poly.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
writeFileSync(
  `${OUT}favicon.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1a4a66"/>
  <polygon points="${points(LEFT_PAGE)}" fill="#ffffff"/>
  <polygon points="${points(RIGHT_PAGE)}" fill="#ffffff"/>
  <polygon points="${points(RIBBON)}" fill="#17a2c4"/>
</svg>
`
);

console.log(`icons written to ${OUT}: ${ICONS.map((i) => i.file).join(", ")}, favicon.svg`);
