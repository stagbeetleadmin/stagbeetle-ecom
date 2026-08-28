// POST /api/products/detect-color
//
// Traditional (non-AI) dominant-colour detection for a product image.
// Decodes + downscales the upload with sharp, then hands the raw pixels to
// the dependency-free CV pipeline in src/lib/colorDetection.ts. No LLM, no
// vision API, no external service — everything runs in-process.
//
// Request:  multipart/form-data  { image: <file> }
// Response: { success, color: { name, code, confidence }, ... }
//
// A detection that simply can't find a clear colour still returns HTTP 200
// with `success: false` so the caller can fall back to manual selection
// without treating it as a hard error.

import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { detectColor } from '@/lib/colorDetection';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const ANALYSIS_MAX_DIM = 160; // px — plenty for dominant-colour work
const ADMIN_EMAIL = 'stagbeetlebilling@gmail.com';

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

// Mirrors the app's existing (client-side) admin gate. Best-effort: when
// Supabase isn't configured (local dev with the mocked admin) we don't
// block — the endpoint only does image maths, it exposes no data.
async function ensureAdmin(): Promise<{ ok: true } | { ok: false; status: number }> {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (!supabaseConfigured) return { ok: true };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return process.env.NODE_ENV === 'production' ? { ok: false, status: 401 } : { ok: true };
    }
    if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return { ok: false, status: 403 };
    }
    return { ok: true };
  } catch {
    return process.env.NODE_ENV === 'production' ? { ok: false, status: 401 } : { ok: true };
  }
}

export async function POST(request: NextRequest) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return json({ success: false, error: 'Not authorised.', code: 'UNAUTHORISED' }, auth.status);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'Expected multipart/form-data.', code: 'BAD_REQUEST' }, 400);
  }

  const image = form.get('image');
  if (!(image instanceof Blob) || image.size === 0) {
    return json(
      { success: false, error: 'No image file provided under field "image".', code: 'NO_IMAGE' },
      400,
    );
  }
  if (image.size > MAX_UPLOAD_BYTES) {
    return json(
      { success: false, error: 'Image is too large (max 15 MB).', code: 'IMAGE_TOO_LARGE' },
      413,
    );
  }

  // --- Decode + downscale (this is the only place the image is touched;
  //     the original upload is never modified) ---------------------------
  let raw: { data: Buffer; info: sharp.OutputInfo };
  try {
    raw = await sharp(Buffer.from(await image.arrayBuffer()))
      .rotate() // honour EXIF orientation
      .resize(ANALYSIS_MAX_DIM, ANALYSIS_MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return json(
      {
        success: false,
        error: 'Unable to read the image. It may be corrupt or an unsupported format.',
        code: 'INVALID_IMAGE',
      },
      415,
    );
  }

  const result = detectColor({
    data: new Uint8Array(raw.data.buffer, raw.data.byteOffset, raw.data.byteLength),
    width: raw.info.width,
    height: raw.info.height,
    channels: (raw.info.channels as 3 | 4) ?? 3,
  });

  if (!result.success) {
    // Processed fine, just couldn't decide — 200 so the client falls back
    // to manual selection cleanly.
    return json({ success: false, error: result.error, code: result.code }, 200);
  }

  return json({
    success: true,
    color: result.color,
    confidenceLevel: result.confidenceLevel,
    paletteHex: result.paletteHex,
    detectedHex: result.detectedHex,
    alternatives: result.alternatives,
    foregroundRatio: result.foregroundRatio,
    needsVerification: result.needsVerification,
    message: result.message ?? null,
  });
}
