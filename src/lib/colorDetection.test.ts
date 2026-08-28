// Run with: npm test   (node --test, TypeScript stripped natively)
import test from 'node:test';
import assert from 'node:assert/strict';

import { detectColor, rgbToHsv, hsvDistance, type DetectionInput } from './colorDetection';
import { PRODUCT_COLORS, hexToRgb } from './colors';

// -------------------------------------------------------------------------
// Synthetic garment-photo generator.
//
// Draws a solid garment rectangle over a solid backdrop with a little
// per-pixel sensor noise, mimicking a real ecommerce product shot closely
// enough to exercise the background removal + clustering + matching path.
// -------------------------------------------------------------------------
type RGBTuple = [number, number, number];

interface SceneOptions {
  w?: number;
  h?: number;
  bg?: RGBTuple;
  fg: RGBTuple;
  /** garment box as [x0, y0, x1, y1] fractions of the frame */
  box?: [number, number, number, number];
  /** extra coloured patches: [x0, y0, x1, y1, colour] fractions */
  patches?: Array<[number, number, number, number, RGBTuple]>;
  noise?: number;
  seed?: number;
}

function scene(opts: SceneOptions): DetectionInput {
  const w = opts.w ?? 120;
  const h = opts.h ?? 160;
  const bg = opts.bg ?? [245, 245, 245];
  const [bx0, by0, bx1, by1] = opts.box ?? [0.26, 0.1, 0.74, 0.92];
  const noise = opts.noise ?? 6;
  let s = opts.seed ?? 1;
  const rand = () => {
    // deterministic LCG so tests never flake
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const jit = (c: number) => Math.max(0, Math.min(255, Math.round(c + (rand() - 0.5) * 2 * noise)));

  const x0 = Math.floor(w * bx0);
  const x1 = Math.floor(w * bx1);
  const y0 = Math.floor(h * by0);
  const y1 = Math.floor(h * by1);
  const data = new Uint8Array(w * h * 3);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let col: RGBTuple = bg;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) col = opts.fg;
      for (const [px0, py0, px1, py1, pcol] of opts.patches ?? []) {
        if (x >= w * px0 && x < w * px1 && y >= h * py0 && y < h * py1) col = pcol;
      }
      const i = (y * w + x) * 3;
      data[i] = jit(col[0]);
      data[i + 1] = jit(col[1]);
      data[i + 2] = jit(col[2]);
    }
  }
  return { data, width: w, height: h, channels: 3 };
}

const swatch = (name: string): RGBTuple => {
  const c = PRODUCT_COLORS.find((p) => p.name === name)!;
  const { r, g, b } = hexToRgb(c.hex);
  return [r, g, b];
};

// =======================================================================
// Colour-space helpers
// =======================================================================
test('rgbToHsv: primaries and greys', () => {
  assert.deepEqual(rgbToHsv({ r: 0, g: 0, b: 0 }), { h: 0, s: 0, v: 0 });
  const white = rgbToHsv({ r: 255, g: 255, b: 255 });
  assert.equal(white.s, 0);
  assert.equal(white.v, 1);
  const red = rgbToHsv({ r: 255, g: 0, b: 0 });
  assert.equal(Math.round(red.h), 0);
  assert.equal(red.s, 1);
  const blue = rgbToHsv({ r: 0, g: 0, b: 255 });
  assert.equal(Math.round(blue.h), 240);
});

test('hsvDistance: identical is zero, navy nearer navy than sky/black', () => {
  const navy = rgbToHsv(hexToRgb('#1F2A44'));
  const sky = rgbToHsv(hexToRgb('#8FC7E8'));
  const black = rgbToHsv(hexToRgb('#1B1B1B'));
  assert.equal(hsvDistance(navy, navy), 0);
  assert.ok(hsvDistance(navy, navy) < hsvDistance(navy, sky));
  assert.ok(hsvDistance(navy, navy) < hsvDistance(navy, black));
});

// =======================================================================
// Detection — the palette cases from the brief
// =======================================================================
const paletteCases: Array<[string, SceneOptions, string]> = [
  ['Navy Blue shirt on white', { fg: swatch('Navy Blue') }, 'NBL'],
  ['Black shirt on white', { fg: [22, 22, 24] }, 'BLK'],
  ['Purple shirt', { fg: swatch('Purple') }, 'PPL'],
  ['Sky Blue shirt', { fg: swatch('Sky Blue') }, 'SKBL'],
  ['Mauve shirt', { fg: swatch('Mauve') }, 'MV'],
  ['Dark Grey shirt', { fg: swatch('Dark Grey') }, 'DGY'],
  ['Light Grey shirt on mid-grey bg', { fg: swatch('Light Grey'), bg: [120, 120, 120] }, 'LGY'],
  ['Light Green shirt', { fg: swatch('Light Green') }, 'LGN'],
  ['Pista Green shirt', { fg: swatch('Pista Green') }, 'PGN'],
  ['White shirt on non-white bg', { fg: swatch('White'), bg: [110, 120, 130] }, 'WHT'],
];

for (const [label, opts, expected] of paletteCases) {
  test(`detectColor: ${label} -> ${expected}`, () => {
    const res = detectColor(scene(opts));
    assert.equal(res.success, true, `expected success for ${label}`);
    if (!res.success) return;
    assert.equal(res.color.code, expected);
    assert.equal(res.color.name, PRODUCT_COLORS.find((p) => p.code === expected)!.name);
    assert.ok(res.color.confidence > 0.6, `confidence ${res.color.confidence} too low`);
  });
}

// =======================================================================
// Background handling
// =======================================================================
test('large white background does not win over a small garment', () => {
  // garment covers ~8% of the frame, white covers the rest
  const res = detectColor(scene({ fg: swatch('Navy Blue'), box: [0.4, 0.3, 0.6, 0.7] }));
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.equal(res.color.code, 'NBL');
  assert.notEqual(res.color.code, 'WHT');
});

test('garment filling the whole frame (no visible backdrop)', () => {
  const res = detectColor(scene({ fg: swatch('Purple'), box: [0, 0, 1, 1] }));
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.equal(res.color.code, 'PPL');
});

// =======================================================================
// Multi-colour products
// =======================================================================
test('multi-colour product returns the dominant colour', () => {
  const res = detectColor(
    scene({
      fg: swatch('Navy Blue'),
      // interior blocks — kept off the garment edge so they aren't
      // flood-filled away as edge-connected background
      patches: [
        [0.36, 0.22, 0.64, 0.44, [240, 240, 240]], // white block
        [0.38, 0.72, 0.56, 0.86, [200, 30, 30]], // red block
      ],
    }),
  );
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.equal(res.color.code, 'NBL');
  assert.ok(res.alternatives.some((a) => a.code === 'WHT'));
});

test('a centre logo is not mistaken for the product colour', () => {
  const res = detectColor(
    scene({ fg: swatch('Navy Blue'), patches: [[0.42, 0.42, 0.58, 0.56, [245, 245, 245]]] }),
  );
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.equal(res.color.code, 'NBL');
});

// =======================================================================
// Confidence / ambiguity
// =======================================================================
test('near 50/50 navy vs black is reported without high confidence', () => {
  const res = detectColor(
    scene({
      fg: [44, 44, 52],
      box: [0.24, 0.1, 0.49, 0.92],
      patches: [[0.5, 0.1, 0.76, 0.92, [18, 22, 40]]],
    }),
  );
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.ok(['NBL', 'BLK'].includes(res.color.code));
  assert.ok(
    res.color.confidence < 0.9 || res.needsVerification,
    `ambiguous scene should not be high-confidence (got ${res.color.confidence})`,
  );
});

test('heavy noise / low quality lowers confidence but still resolves', () => {
  const res = detectColor(scene({ fg: swatch('Sky Blue'), noise: 70, seed: 9 }));
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.ok(res.color.confidence <= 0.9, `expected reduced confidence, got ${res.color.confidence}`);
});

// =======================================================================
// Error handling
// =======================================================================
test('empty image fails gracefully', () => {
  const res = detectColor({ data: new Uint8Array(0), width: 0, height: 0 });
  assert.equal(res.success, false);
  if (res.success) return;
  assert.equal(res.code, 'EMPTY_IMAGE');
});

test('tiny image is rejected', () => {
  const res = detectColor({ data: new Uint8Array(3 * 9), width: 3, height: 3, channels: 3 });
  assert.equal(res.success, false);
  if (res.success) return;
  assert.equal(res.code, 'IMAGE_TOO_SMALL');
});

test('RGBA input is accepted (alpha channel ignored)', () => {
  const base = scene({ fg: swatch('Light Green') });
  const rgba = new Uint8Array((base.width as number) * (base.height as number) * 4);
  for (let p = 0; p < base.width * base.height; p++) {
    rgba[p * 4] = base.data[p * 3];
    rgba[p * 4 + 1] = base.data[p * 3 + 1];
    rgba[p * 4 + 2] = base.data[p * 3 + 2];
    rgba[p * 4 + 3] = 255;
  }
  const res = detectColor({ data: rgba, width: base.width, height: base.height, channels: 4 });
  assert.equal(res.success, true);
  if (!res.success) return;
  assert.equal(res.color.code, 'LGN');
});
