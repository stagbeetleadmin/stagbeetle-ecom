import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Only these path prefixes actually consume a server-side Supabase session
// (the admin dashboard and the API routes). Every other route — the whole
// storefront: `/`, `/product/*`, and all the marketing pages — manages auth
// entirely client-side (see AuthContext), so running the Supabase auth
// round-trip in middleware for them just added up to 3s of latency to every
// page load and client navigation for zero benefit.
const SESSION_SENSITIVE_PREFIXES = ['/admin', '/profile', '/checkout', '/success', '/join', '/api'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsSession = SESSION_SENSITIVE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!needsSession) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
