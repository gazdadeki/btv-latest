// Placeholder PWA icon generator.
//
// Produces a deterministic placeholder mark (gold "play" disc on the dark
// brand background) at every size the manifest / iOS / favicon need. No
// external brand art or system fonts required — the glyph is pure vector, so
// `node scripts/generate-icons.mjs` reproduces identical output anywhere.
//
// ── Swapping in real brand art ───────────────────────────────────────────────
// Replace `renderSvg()` below with your final logo (return an <svg> string, or
// load a square source PNG/SVG with sharp instead of `Buffer.from(svg)`), then
// re-run `npm run icons`. Keep the OUTPUTS list (paths + sizes + purpose rules)
// intact so the manifest / layout references don't change. Notes for real art:
//   - `apple-touch-icon.png` must be OPAQUE (iOS ignores alpha + maskable).
//   - the maskable icon needs ~20% safe-zone padding (art inside center 60–80%).
//   - keep `any` icons full-bleed for the crispest home-screen render.

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BG = '#0f0e0c'; // brand dark (matches app body + manifest background_color)
const FG = '#c9a84c'; // brand gold

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

// circleRatio = disc radius as a fraction of canvas. Full-bleed icons use a
// large disc; the maskable variant uses a smaller disc so the whole mark stays
// inside the maskable safe zone (center 80%) after the OS crops it.
function renderSvg(size, circleRatio) {
  const c = size / 2;
  const r = size * circleRatio;
  const t = r * 0.9; // play-triangle extent
  // Rightward play triangle, nudged right so it reads optically centered.
  const x1 = c - t * 0.28;
  const x2 = c - t * 0.28;
  const x3 = c + t * 0.52;
  const y1 = c - t * 0.46;
  const y2 = c + t * 0.46;
  const y3 = c;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="${FG}"/>
  <polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${BG}"/>
</svg>`;
}

const OUTPUTS = [
  { file: 'icons/icon-192.png', size: 192, ratio: 0.42 }, // manifest: any
  { file: 'icons/icon-512.png', size: 512, ratio: 0.42 }, // manifest: any
  { file: 'icons/icon-maskable-512.png', size: 512, ratio: 0.32 }, // manifest: maskable (safe zone)
  { file: 'apple-touch-icon.png', size: 180, ratio: 0.42 }, // iOS home screen (opaque)
  { file: 'favicon-32x32.png', size: 32, ratio: 0.42 }, // browser tab
];

for (const { file, size, ratio } of OUTPUTS) {
  const svg = renderSvg(size, ratio);
  await sharp(Buffer.from(svg))
    .flatten({ background: BG }) // guarantee opaque output (required for apple-touch-icon)
    .png()
    .toFile(resolve(PUBLIC, file));
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log('\nPlaceholder icons generated. Swap in real art and re-run before launch.');
