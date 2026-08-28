# Cutover: switch the app from Singapore to Mumbai

The data migration is done and verified (see `verify.mjs`). This is the
config-only cutover — Google OAuth on the new project, then the env swap.

Nothing here touches the old project, so you can roll back at any point.

---

## 0. Env files — how they're organised

| file | what it is | auto-loaded by Next.js? |
|---|---|---|
| `.env.local` | **the live one** — currently Singapore | yes |
| `.env.local.singapore` | rollback snapshot of Singapore | no (reference copy) |
| `.env.local.mumbai` | the new Mumbai config | no (reference copy) |

Only three keys differ between the two snapshots: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`.

Switch:   `cp .env.local.mumbai .env.local`   then restart dev / redeploy.
Roll back: `cp .env.local.singapore .env.local`  then restart dev / redeploy.

---

## 1. Google OAuth for the new project

The sign-in flow is: browser → Supabase → Google → Supabase callback → app.
Two systems need updating: **Google Cloud Console** (trusts Supabase's callback)
and the **new Supabase project** (holds the client id/secret + the app
redirect allow-list).

### 1a. Google Cloud Console

console.cloud.google.com → **APIs & Services → Credentials** → OAuth 2.0 Client
IDs → open the client `340733671044-1l26l1o218nutkjecbmgkfnd0onbjuu2…`

- **Authorized redirect URIs → + Add URI:**
  `https://uzhdhxfcvptgowkuupmz.supabase.co/auth/v1/callback`
  Keep the existing `https://lpkasszpjklrmwugeupp.supabase.co/auth/v1/callback`
  too (so rollback still works). **Save.**
- While you're here, copy the **Client secret** shown on this page — you need
  it in step 1b.
- "Authorized JavaScript origins" — no change needed (those are your app
  domains, not per-Supabase-project).

Google can take a few minutes to propagate a new redirect URI.

### 1b. New Supabase project → Authentication → Providers → Google

- Toggle **Enabled**.
- **Client ID (for OAuth):**
  `340733671044-1l26l1o218nutkjecbmgkfnd0onbjuu2.apps.googleusercontent.com`
- **Client Secret (for OAuth):** paste the secret from 1a.
- The read-only **Callback URL** shown here must equal the URI you added in 1a
  (`https://uzhdhxfcvptgowkuupmz.supabase.co/auth/v1/callback`).
- Leave "Skip nonce checks" as it was on the old project (default: off).
- **Save.**

### 1c. New Supabase project → Authentication → URL Configuration

The app calls `signInWithOAuth({ redirectTo: window.location.origin })`, so
every origin you sign in from must be allow-listed here.

- **Site URL:** your production URL (e.g. `https://<your-domain>` or the Vercel
  production domain).
- **Redirect URLs → add:**
  - `http://localhost:3000/**`
  - `https://<your-production-domain>/**`
  - `https://<your-vercel-project>-*.vercel.app/**`  (only if you sign in on
    preview deployments)

### 1d. Email / password + email settings

Password logins already work (users + password hashes migrated) — no config.
But **match the old project's Email provider settings** on the new one:
Authentication → Providers → Email — in particular the **"Confirm email"**
toggle (if signups on the old project didn't require verification, turn it off
here too).

### 1e. Expect everyone to be logged out once

The new project signs tokens with a different secret, so existing browser
sessions from the old project won't validate — every user signs in again after
cutover. Accounts, profiles, orders, passwords all carried over; only live
sessions don't.

---

## 2. Point the app at Mumbai

1. Paste the Mumbai **publishable key** into `.env.local.mumbai`
   (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` — from the new project's
   Settings → API Keys → *publishable*, the browser-safe one, **not**
   service_role).
2. Local:
   ```bash
   cp .env.local.mumbai .env.local
   # restart the dev server
   ```
3. Vercel — update the same keys for every environment that runs the app
   (Production, Preview, Development), then redeploy:
   ```bash
   # via CLI (npm i -g vercel; vercel link) — or do it in the dashboard UI
   printf '%s' 'https://uzhdhxfcvptgowkuupmz.supabase.co' | vercel env add NEXT_PUBLIC_SUPABASE_URL production
   printf '%s' '<mumbai publishable key>'                 | vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   printf '%s' '<mumbai DATABASE_URL>'                    | vercel env add DATABASE_URL production
   # remove the old values first if `add` complains they exist:
   #   vercel env rm NEXT_PUBLIC_SUPABASE_URL production
   vercel --prod   # redeploy
   ```
   `vercel.json` already pins `"regions": ["bom1"]` (Mumbai) — leave it.

---

## 3. Smoke test (on the Mumbai deployment)

- [ ] Storefront grid loads; product images render (they're on the new bucket now).
- [ ] Open a product detail page — images, sizes, stock all show.
- [ ] Google sign-in completes and lands back logged in.
- [ ] Email/password sign-in works for an existing user; their profile + past orders are there.
- [ ] Admin: gate lets you in; add a product, edit one, delete one; the Stock column fills in.
- [ ] Place a test order end-to-end (Razorpay unaffected).
- [ ] Watch Vercel runtime logs for any Supabase 4xx/5xx.

---

## 4. Optional — recreate what wasn't migrated

Neither is required for the app to work; the storefront and admin function
without them.

- **`on_auth_user_created` trigger** on `auth.users` (auto-inserts a `profiles`
  row on signup). The `public.handle_new_user()` function came across; the
  trigger binding lives in the `auth` schema and didn't. The app's
  `AuthContext` upserts a profile on first login, so logins are fine — recreate
  the trigger only if you want the DB-side guarantee. Get its exact definition
  from the old project (SQL editor):
  ```sql
  select pg_get_triggerdef(oid) from pg_trigger
  where tgrelid = 'auth.users'::regclass and not tgisinternal;
  ```
  then run that `CREATE TRIGGER …` on the new project.
- **`rls_auto_enable` event trigger** — only matters if you later add tables
  via raw SQL and want RLS auto-enabled. Every current table already has RLS on.

---

## 5. After a few days stable

- Supabase dashboard → old project → Pause, then Delete.
- `rm -rf migration/dump migration/.env.migration`
- Delete `.env.local.singapore` once you're sure you won't roll back.
- Consider rotating the secrets that passed through tooling during the
  migration (both `service_role` keys, the DB passwords).
