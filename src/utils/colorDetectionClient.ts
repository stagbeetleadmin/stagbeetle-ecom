// Client-side helper for the /api/products/detect-color endpoint.
//
// Keeps the network + de-dupe plumbing out of the admin page component so
// detection only runs when it should (new primary image / explicit
// request), never on every render.

import type { ConfidenceLevel } from '@/lib/colors';

export interface ColorSuggestion {
  name: string;
  code: string;
  /** Palette reference swatch. */
  hex: string;
  /** Actual averaged colour of the detected region. */
  detectedHex: string;
  confidence: number; // 0..1
  level: ConfidenceLevel;
  needsVerification: boolean;
  message: string | null;
  alternatives: Array<{ name: string; code: string; share: number }>;
}

const GENERIC_FAILURE =
  'Unable to automatically detect the product color. Please select it manually.';

/**
 * Uploads an image to the detection endpoint and returns a normalised
 * suggestion. Throws {@link GENERIC_FAILURE} on any failure so the caller
 * has a single friendly message to surface.
 */
export async function detectProductColor(file: Blob): Promise<ColorSuggestion> {
  const body = new FormData();
  body.append('image', file, 'product-image');

  let res: Response;
  try {
    res = await fetch('/api/products/detect-color', { method: 'POST', body });
  } catch {
    throw new Error(GENERIC_FAILURE);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(GENERIC_FAILURE);
  }

  return {
    name: payload.color.name,
    code: payload.color.code,
    hex: payload.paletteHex,
    detectedHex: payload.detectedHex,
    confidence: payload.color.confidence,
    level: payload.confidenceLevel,
    needsVerification: !!payload.needsVerification,
    message: payload.message ?? null,
    alternatives: Array.isArray(payload.alternatives) ? payload.alternatives : [],
  };
}

/**
 * Cheap, stable fingerprint of an image blob (length + strided FNV-1a) so
 * re-running detection on an unchanged image can be skipped, and editing
 * unrelated fields (price, MRP, description…) never re-triggers analysis.
 */
export async function fingerprintBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let h = 0x811c9dc5;
  const stride = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += stride) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return `${bytes.length}:${(h >>> 0).toString(16)}`;
}

export { GENERIC_FAILURE as COLOR_DETECTION_FAILURE_MESSAGE };
