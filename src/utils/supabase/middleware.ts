import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return early if Supabase credentials are not configured yet (e.g. in Vercel settings)
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can write a request with
  // invalid credentials.
  //
  // This runs on the server, in front of every page — unlike every other
  // Supabase call in this app it previously had NO timeout, so a slow or
  // hung connection to Supabase's auth endpoint blocked the entire page
  // response (nothing, not even the HTML, would reach the browser until it
  // resolved). Bounding it means a shopper always gets the page within ~3s;
  // worst case their session cookie just doesn't get refreshed on that one
  // request, which client-side auth handling already tolerates.
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Middleware auth check timed out')), 3000)),
    ]);
  } catch (e) {
    console.error("Middleware auth verification failed or timed out:", e);
  }

  return supabaseResponse;
}
