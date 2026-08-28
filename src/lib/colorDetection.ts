// =========================================================================
// Non-AI product-colour detection.
//
// Traditional computer vision only — no LLM, no vision API, no external
// service. Given the raw pixels of a (small, already-resized) garment
// image this module:
//
//   1. converts every pixel RGB -> HSV
//   2. estimates the background colour by sampling the border
//   3. removes background pixels that are *connected to the edge*
//      (flood fill) so a white logo in the middle of a navy shirt is kept
//   4. k-means clusters the remaining product pixels
//   5. matches the dominant cluster against the centralised palette
//      (src/lib/colors.ts) using an HSV-aware distance
//   6. derives a confidence score from match quality, how dominant the
//      cluster is, and how clearly it beats the runner-up
//
// Everything here is deterministic and dependency-free so it can be unit
// tested against synthetic pixel buffers (see colorDetection.test.ts). The
// image decoding / resizing lives in the route handler, not here.
// =========================================================================

import {
  PRODUCT_COLORS,
  confidenceLevel,
  VERIFY_COLOR_HINT,
  hexToRgb,
  type ConfidenceLevel,
  type PaletteColor,
} from './colors';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export interface DetectionInput {
  /** RGB or RGBA bytes, row-major, top-left origin. */
  data: Uint8Array | Uint8ClampedArray | number[];
  width: number;
  height: number;
  /** 3 for RGB, 4 for RGBA. Defaults to inferring from data length. */
  channels?: 3 | 4;
}

export interface DetectedColorAlternative {
  name: string;
  code: string;
  /** Share of product pixels (0..1) that fell to this palette colour. */
  share: number;
}

export interface ColorDetectionResult {
  success: true;
  color: {
    name: string;
    code: string;
    confidence: number; // 0..1, rounded to 2 dp
  };
  confidenceLevel: ConfidenceLevel;
  /** Reference swatch of the matched palette colour. */
  paletteHex: string;
  /** Actual averaged colour of the dominant product region. */
  detectedHex: string;
  /** Up to two runner-up palette colours by pixel share. */
  alternatives: DetectedColorAlternative[];
  /** Fraction of the image treated as product (vs background). */
  foregroundRatio: number;
  /** True when the border flood-fill removed almost everything and we
   *  fell back to analysing the centre region only. */
  usedCenterFallback: boolean;
  /** True when the result is ambiguous / low confidence. */
  needsVerification: boolean;
  message?: string;
}

export interface ColorDetectionFailure {
  success: false;
  error: string;
  code:
    | 'EMPTY_IMAGE'
    | 'IMAGE_TOO_SMALL'
    | 'NO_DOMINANT_COLOR'
    | 'PROCESSING_ERROR';
}

export type DetectColorOutcome = ColorDetectionResult | ColorDetectionFailure;

// -------------------------------------------------------------------------
// Tunables — kept together so behaviour is easy to reason about / adjust.
// -------------------------------------------------------------------------
const CONFIG = {
  /** Pixels within this fraction of an edge seed the background flood fill. */
  borderFraction: 0.06,
  /** Base RGB (0..255 euclidean) tolerance for "same as background". */
  bgToleranceBase: 26,
  bgToleranceMax: 52,
  /** Below this product-pixel ratio the border flood fill has effectively
   *  swallowed the whole frame (garment fills the shot, no visible
   *  backdrop) — only then do we fall back to the centre region. A small
   *  but coherent foreground (tiny product on a large white sweep) is
   *  still trusted. */
  minForegroundRatio: 0.02,
  /** Central box (as a fraction of each axis) used for the fallback. */
  centerBoxFraction: 0.5,
  /** k for k-means and the max sample size fed to it. */
  clusterCount: 5,
  maxClusterSamples: 4000,
  kmeansIterations: 20,
  /** Clusters smaller than this share of product pixels are treated as noise. */
  minClusterShare: 0.04,
  /** Saturation below this is "achromatic" (white / grey / black ramp). */
  achromaticSat: 0.15,
  /** hsvDistance at/above which match quality is considered zero. */
  distanceZeroAt: 0.62,
  /** Confidence weighting. */
  wMatchQuality: 0.5,
  wDominance: 0.3,
  wSeparation: 0.2,
  /** Runner-up within this ratio of the primary -> force "verify". */
  ambiguousShareRatio: 0.8,
} as const;

// -------------------------------------------------------------------------
// Colour-space helpers
// -------------------------------------------------------------------------
export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * HSV-aware perceptual-ish distance. Handles the achromatic ramp
 * (black/grey/white differ only in value) separately from chromatic
 * colours (where hue carries most of the meaning), and down-weights hue
 * for weakly saturated colours where hue is unstable.
 *
 * Returns roughly 0 (identical) .. ~1.5 (opposite).
 */
export function hsvDistance(a: HSV, b: HSV): number {
  const dv = Math.abs(a.v - b.v);
  const ds = Math.abs(a.s - b.s);
  const aAchroma = a.s < CONFIG.achromaticSat;
  const bAchroma = b.s < CONFIG.achromaticSat;

  if (aAchroma && bAchroma) {
    // Pure grey ramp: value dominates, saturation barely matters.
    return Math.hypot(dv * 1.2, ds * 0.3);
  }

  if (aAchroma !== bAchroma) {
    // One neutral, one coloured — the more saturated the coloured one is,
    // the further apart they are.
    const chroma = aAchroma ? b.s : a.s;
    return Math.hypot(dv * 0.9, ds * 0.55, chroma * 0.6);
  }

  // Both chromatic.
  let hd = Math.abs(a.h - b.h);
  if (hd > 180) hd = 360 - hd;
  const hueNorm = hd / 180; // 0..1
  // Hue only fully counts once both colours are reasonably saturated.
  const hueWeight = 1.25 * Math.min(1, Math.min(a.s, b.s) / 0.45);
  return Math.hypot(hueNorm * hueWeight, ds * 0.55, dv * 0.7);
}

// -------------------------------------------------------------------------
// Pixel extraction
// -------------------------------------------------------------------------
function readPixels(input: DetectionInput): { pixels: RGB[]; width: number; height: number } {
  const { data, width, height } = input;
  const channels =
    input.channels ?? (data.length === width * height * 4 ? 4 : 3);
  const pixels: RGB[] = new Array(width * height);
  for (let i = 0, p = 0; p < width * height; p++, i += channels) {
    pixels[p] = { r: data[i], g: data[i + 1], b: data[i + 2] };
  }
  return { pixels, width, height };
}

function medianRGB(list: RGB[]): RGB {
  const pick = (key: keyof RGB) => {
    const arr = list.map((c) => c[key]).sort((x, y) => x - y);
    return arr[arr.length >> 1];
  };
  return { r: pick('r'), g: pick('g'), b: pick('b') };
}

function rgbDist(a: RGB, b: RGB): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

// -------------------------------------------------------------------------
// Background removal — border sample + edge-connected flood fill
// -------------------------------------------------------------------------
function buildForegroundMask(
  pixels: RGB[],
  width: number,
  height: number,
): { mask: Uint8Array; foregroundCount: number; bg: RGB } {
  const margin = Math.max(2, Math.round(Math.min(width, height) * CONFIG.borderFraction));
  const border: RGB[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < margin || y < margin || x >= width - margin || y >= height - margin) {
        border.push(pixels[y * width + x]);
      }
    }
  }

  const bg = medianRGB(border);
  // Spread of the border pixels around their median widens the tolerance
  // for noisy / gradient studio backdrops.
  const spread =
    border.reduce((sum, c) => sum + rgbDist(c, bg), 0) / Math.max(1, border.length);
  const tol = Math.min(
    CONFIG.bgToleranceMax,
    CONFIG.bgToleranceBase + spread * 0.8,
  );

  // Flood fill from every border pixel, keeping only background that is
  // actually connected to the edge.
  const isBg = new Uint8Array(width * height); // 1 = background
  const stack: number[] = [];
  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1);
  }
  while (stack.length) {
    const idx = stack.pop()!;
    if (isBg[idx]) continue;
    if (rgbDist(pixels[idx], bg) > tol) continue;
    isBg[idx] = 1;
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < width - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - width);
    if (y < height - 1) stack.push(idx + width);
  }

  const mask = new Uint8Array(width * height); // 1 = foreground
  let foregroundCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!isBg[i]) {
      mask[i] = 1;
      foregroundCount++;
    }
  }
  return { mask, foregroundCount, bg };
}

function centerRegionMask(
  pixels: RGB[],
  width: number,
  height: number,
  bg: RGB,
): { mask: Uint8Array; count: number } {
  const bx = Math.round((width * (1 - CONFIG.centerBoxFraction)) / 2);
  const by = Math.round((height * (1 - CONFIG.centerBoxFraction)) / 2);
  const mask = new Uint8Array(width * height);
  let count = 0;
  for (let y = by; y < height - by; y++) {
    for (let x = bx; x < width - bx; x++) {
      const idx = y * width + x;
      // Still skip anything that looks like the sampled backdrop, so the
      // fallback box never re-introduces the white/grey it was meant to
      // avoid.
      if (rgbDist(pixels[idx], bg) <= CONFIG.bgToleranceBase) continue;
      mask[idx] = 1;
      count++;
    }
  }
  // If dropping background emptied the box (garment *is* ~backdrop colour,
  // e.g. a genuine white/grey product filling the frame), keep the whole
  // box — the colour is what it is.
  if (count === 0) {
    for (let y = by; y < height - by; y++) {
      for (let x = bx; x < width - bx; x++) {
        mask[y * width + x] = 1;
        count++;
      }
    }
  }
  return { mask, count };
}

// -------------------------------------------------------------------------
// Deterministic k-means (Lloyd) in RGB space
// -------------------------------------------------------------------------
interface Cluster {
  center: RGB;
  count: number;
}

function kMeans(samples: RGB[], k: number, iterations: number): Cluster[] {
  const n = samples.length;
  k = Math.min(k, n);
  if (k <= 0) return [];

  // Deterministic seeding: order by luminance, take k evenly spaced points.
  const ordered = [...samples].sort(
    (a, b) => 0.299 * a.r + 0.587 * a.g + 0.114 * a.b - (0.299 * b.r + 0.587 * b.g + 0.114 * b.b),
  );
  let centers: RGB[] = [];
  for (let i = 0; i < k; i++) {
    const pos = Math.floor(((i + 0.5) / k) * n);
    centers.push({ ...ordered[Math.min(n - 1, pos)] });
  }

  const assign = new Int32Array(n);
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = rgbDist(samples[i], centers[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        moved = true;
      }
    }

    const sums = Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < n; i++) {
      const s = sums[assign[i]];
      s.r += samples[i].r;
      s.g += samples[i].g;
      s.b += samples[i].b;
      s.n++;
    }

    const next: RGB[] = centers.map((prev, c) => {
      const s = sums[c];
      if (s.n === 0) {
        // Re-seed an empty cluster to the sample farthest from any centre.
        let far = samples[0];
        let farD = -1;
        for (let i = 0; i < n; i++) {
          const d = rgbDist(samples[i], centers[assign[i]]);
          if (d > farD) {
            farD = d;
            far = samples[i];
          }
        }
        return { ...far };
      }
      return { r: s.r / s.n, g: s.g / s.n, b: s.b / s.n };
    });

    const shift = next.reduce((m, c, i) => Math.max(m, rgbDist(c, centers[i])), 0);
    centers = next;
    if (!moved || shift < 0.5) break;
  }

  const counts = new Array(k).fill(0);
  for (let i = 0; i < n; i++) counts[assign[i]]++;
  return centers
    .map((center, c) => ({ center, count: counts[c] }))
    .filter((cl) => cl.count > 0);
}

// -------------------------------------------------------------------------
// Palette matching
// -------------------------------------------------------------------------
const PALETTE_HSV: Array<{ color: PaletteColor; hsv: HSV }> = PRODUCT_COLORS.map((color) => ({
  color,
  hsv: rgbToHsv(hexToRgb(color.hex)),
}));

function nearestPaletteColor(hsv: HSV): { color: PaletteColor; distance: number } {
  let best = PALETTE_HSV[0];
  let bestD = Infinity;
  for (const entry of PALETTE_HSV) {
    const d = hsvDistance(hsv, entry.hsv);
    if (d < bestD) {
      bestD = d;
      best = entry;
    }
  }
  return { color: best.color, distance: bestD };
}

// -------------------------------------------------------------------------
// Entry point
// -------------------------------------------------------------------------
export function detectColor(input: DetectionInput): DetectColorOutcome {
  try {
    if (!input || !input.width || !input.height || !input.data || input.data.length === 0) {
      return { success: false, code: 'EMPTY_IMAGE', error: 'No image data provided.' };
    }
    if (input.width < 8 || input.height < 8) {
      return { success: false, code: 'IMAGE_TOO_SMALL', error: 'Image is too small to analyse.' };
    }

    const { pixels, width, height } = readPixels(input);

    const fg = buildForegroundMask(pixels, width, height);
    let mask = fg.mask;
    let foregroundCount = fg.foregroundCount;
    const total = width * height;
    let usedCenterFallback = false;

    if (foregroundCount / total < CONFIG.minForegroundRatio || foregroundCount < 40) {
      const center = centerRegionMask(pixels, width, height, fg.bg);
      mask = center.mask;
      foregroundCount = center.count;
      usedCenterFallback = true;
    }

    const foregroundRatio = foregroundCount / total;

    // Collect product pixels, sub-sampling for k-means performance.
    const stride = Math.max(1, Math.ceil(foregroundCount / CONFIG.maxClusterSamples));
    const samples: RGB[] = [];
    for (let i = 0, seen = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      if (seen++ % stride === 0) samples.push(pixels[i]);
    }
    if (samples.length < 4) {
      return { success: false, code: 'NO_DOMINANT_COLOR', error: 'Could not isolate a product region.' };
    }

    const clusters = kMeans(samples, CONFIG.clusterCount, CONFIG.kmeansIterations)
      .filter((cl) => cl.count / samples.length >= CONFIG.minClusterShare)
      .sort((a, b) => b.count - a.count);

    if (clusters.length === 0) {
      return { success: false, code: 'NO_DOMINANT_COLOR', error: 'No clear dominant colour.' };
    }

    const clusteredTotal = clusters.reduce((sum, cl) => sum + cl.count, 0);

    // Fold clusters into palette buckets (weight + distance-weighted avg).
    const buckets = new Map<string, { color: PaletteColor; weight: number; distSum: number }>();
    for (const cl of clusters) {
      const { color, distance } = nearestPaletteColor(rgbToHsv(cl.center));
      const b = buckets.get(color.code) ?? { color, weight: 0, distSum: 0 };
      b.weight += cl.count;
      b.distSum += distance * cl.count;
      buckets.set(color.code, b);
    }

    const ranked = [...buckets.values()]
      .map((b) => ({
        color: b.color,
        share: b.weight / clusteredTotal,
        avgDistance: b.distSum / b.weight,
      }))
      .sort((a, b) => b.share - a.share);

    const primary = ranked[0];
    const runnerUp = ranked[1];

    // --- Confidence -------------------------------------------------------
    const matchQuality = clamp01(1 - primary.avgDistance / CONFIG.distanceZeroAt);
    // Dominance: 0 at a 3-way tie (~0.33), 1 when the primary owns ~90%+.
    const dominance = clamp01((primary.share - 0.34) / (0.9 - 0.34));
    // Separation: how far the primary is ahead of the runner-up.
    const separation = runnerUp ? clamp01((primary.share - runnerUp.share) / 0.45) : 1;

    let confidence =
      CONFIG.wMatchQuality * matchQuality +
      CONFIG.wDominance * dominance +
      CONFIG.wSeparation * separation;

    if (usedCenterFallback) confidence *= 0.85;

    const ambiguous =
      !!runnerUp && runnerUp.share >= CONFIG.ambiguousShareRatio * primary.share;
    if (ambiguous) confidence = Math.min(confidence, 0.6);

    confidence = Math.round(clamp(confidence, 0.05, 0.99) * 100) / 100;
    const level = confidenceLevel(confidence);
    const needsVerification = level === 'low' || ambiguous;

    const dominantCluster = clusters[0];

    return {
      success: true,
      color: {
        name: primary.color.name,
        code: primary.color.code,
        confidence,
      },
      confidenceLevel: level,
      paletteHex: primary.color.hex,
      detectedHex: rgbToHex(dominantCluster.center),
      alternatives: ranked.slice(1, 3).map((r) => ({
        name: r.color.name,
        code: r.color.code,
        share: Math.round(r.share * 100) / 100,
      })),
      foregroundRatio: Math.round(foregroundRatio * 100) / 100,
      usedCenterFallback,
      needsVerification,
      message: needsVerification ? VERIFY_COLOR_HINT : undefined,
    };
  } catch (err) {
    return {
      success: false,
      code: 'PROCESSING_ERROR',
      error: err instanceof Error ? err.message : 'Colour detection failed.',
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
