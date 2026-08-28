// =========================================================================
// Centralised product-colour configuration.
//
// This is the SINGLE source of truth for the colour palette the catalogue
// supports — the admin colour picker, the automatic colour-detection
// pipeline (src/lib/colorDetection.ts) and SKU code generation all read
// from here. Add a new colour by adding one row to PRODUCT_COLORS; nothing
// else needs to change.
//
// `code` feeds the existing SKU convention (STYLE-COLOR-SIZE) unchanged —
// e.g. RODIUM + Navy Blue -> RODIUM-NBL.
// `hex` is the reference swatch used both for UI rendering and as the
// palette anchor the detector matches dominant image colours against, so
// keep it a faithful mid-tone of the real garment colour.
// =========================================================================

export interface PaletteColor {
  name: string;
  code: string;
  hex: string;
}

export const PRODUCT_COLORS: PaletteColor[] = [
  { name: 'Black', code: 'BLK', hex: '#1B1B1B' },
  { name: 'Navy Blue', code: 'NBL', hex: '#1F2A44' },
  { name: 'Purple', code: 'PPL', hex: '#6D2E9A' },
  { name: 'Sky Blue', code: 'SKBL', hex: '#8FC7E8' },
  { name: 'Mauve', code: 'MV', hex: '#B98BA8' },
  { name: 'Dark Grey', code: 'DGY', hex: '#4C4C4C' },
  { name: 'Light Green', code: 'LGN', hex: '#8CC98A' },
  { name: 'White', code: 'WHT', hex: '#F4F4F2' },
  { name: 'Pista Green', code: 'PGN', hex: '#BFD8A8' },
  { name: 'Light Grey', code: 'LGY', hex: '#C9C9C9' },
];

// -------------------------------------------------------------------------
// Confidence thresholds — configurable in one place rather than scattered
// as magic numbers through the detector and the UI.
//   score >= high   -> "High"    (safe to accept)
//   score >= medium -> "Medium"  (accept, but a glance is worth it)
//   score <  medium -> "Low"     (surface "please verify")
// -------------------------------------------------------------------------
export const CONFIDENCE_THRESHOLDS = {
  high: 0.9,
  medium: 0.7,
} as const;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

// Shown to the seller whenever the result is ambiguous or low confidence.
export const VERIFY_COLOR_HINT = 'Please verify the detected color.';

// -------------------------------------------------------------------------
// Lookups
// -------------------------------------------------------------------------
const byCode = new Map(PRODUCT_COLORS.map((c) => [c.code.toUpperCase(), c]));
const byName = new Map(PRODUCT_COLORS.map((c) => [c.name.toLowerCase(), c]));

export function getColorByCode(code: string | undefined | null): PaletteColor | undefined {
  if (!code) return undefined;
  return byCode.get(code.trim().toUpperCase());
}

export function getColorByName(name: string | undefined | null): PaletteColor | undefined {
  if (!name) return undefined;
  return byName.get(name.trim().toLowerCase());
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
