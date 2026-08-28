# Supabase migration: Singapore → Mumbai

Moves the whole backend from the current project
`lpkasszpjklrmwugeupp` (**Southeast Asia / Singapore**, `ap-southeast-1`) to a
new project `uzhdhxfcvptgowkuupmz` (**South Asia / Mumbai**, `ap-south-1`), so
it sits in the same region as Vercel (`bom1`) and next to the users.

Supabase has no in-place region change — this is a dump-and-restore into a
fresh project.

## What moves

| Thing | How | Carried by |
|---|---|---|
| Schema — tables, RLS policies, functions (`is_admin()`), triggers, grants, sequences | `pg_dump --schema-only --schema=public` | `migrate-db.sh` |
| All `public` table data | `pg_dump --data-only` | `migrate-db.sh` |
| Auth users (password hashes + Google identities) | `pg_dump --table=auth.users --table=auth.identities` | `migrate-db.sh` |
| Storage **files** (the image bytes in `garment-images`) | download + re-upload, same paths — the storage service writes fresh `storage.objects` rows on upload | `migrate-storage.mjs` |
| Absolute image URLs stored in rows (they embed the project ref) | find/replace in SQL | `rewrite-urls.sql` |

`storage.objects` metadata is deliberately **not** dumped as SQL — the upload in
stage 2 recreates those rows natively (avoids storage-schema version drift
between the two projects). The app stores image URLs, not object ids, so the
new ids don't matter.

## What does NOT move — redo it by hand on the new project

- **Auth provider config**: Google OAuth client id/secret, Site URL, redirect
  allow-list, email templates, JWT expiry.
- **Google Cloud Console**: add the new callback URL to the OAuth client
  (`https://uzhdhxfcvptgowkuupmz.supabase.co/auth/v1/callback`).
- **Storage bucket settings** beyond public/size/mime (the script recreates the
  bucket with those three); re-check any custom Storage RLS policies.
- **Edge Functions / cron / webhooks / Vault secrets / DB extensions toggled in
  the dashboard**, if you've added any.
- **Realtime**: this app only uses Realtime *Broadcast* (see `src/lib/db.ts`),
  which needs no per-project setup — nothing to do.

---

## Prerequisites

No Docker, no Supabase CLI. Just PG 17 client tools:

```bash
brew install postgresql@17
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"   # also add to ~/.zshrc
pg_dump --version                          # must say 17.x
psql --version                             # must say 17.x
node --version                             # >= 18 (repo already uses 24)
```

`@supabase/supabase-js` is already a project dependency, so the `.mjs` scripts
run with plain `node` from the repo root.

## One-time setup

1. **Create the Mumbai project** (if not already): Supabase dashboard → New
   project → Region **South Asia (Mumbai)**. Save the database password.
2. Copy the config template and fill every value:
   ```bash
   cp migration/env.migration.example migration/.env.migration
   ```
   - `OLD_DB_URL` / `NEW_DB_URL`: the **Session pooler** URI from each
     project's dashboard (Connect → *Session pooler*, **not** Transaction
     pooler). URL-encode `@` in the password as `%40`, etc. The old password is
     in your `.env.local` (`DATABASE_URL`); it contains an `@` → write it
     `%40`.
   - `OLD_SERVICE_ROLE_KEY` / `NEW_SERVICE_ROLE_KEY`: Settings → API →
     `service_role` (reveal), for each project.
3. This whole `migration/` folder's secrets file and dumps are gitignored.

---

## Run it

> Do this in a low-traffic window. Any order placed on the old project *after*
> the data dump won't be on the new one — either accept a short write freeze,
> or re-run `migrate-db.sh` right before cutover (it's a full re-dump/restore).

### Step 1 — database

```bash
./migration/migrate-db.sh
```

Dumps roles + schema + data from the old project and restores into the new one
in a single transaction. If it stops on an error, nothing was committed — fix
and re-run. **Paste the first error if you're unsure.**

Common ones:
- `permission denied` / `must be owner of ...` on a `COMMENT ON SCHEMA public`
  or a stray `GRANT` — the tables and data still matter; if the restore aborts
  on one, open `migration/dump/schema.sql`, delete that single line, re-run.
- `duplicate key value ... auth.users` — the new project already has users
  (you signed into it). Clear them first:
  `psql "$NEW_DB_URL" -c 'truncate auth.users cascade;'` then re-run.
- `column "..." of relation "..." does not exist` — the two projects' schemas
  drifted (unlikely for public tables you control). Tell me the table.
- `pg_dump: server version 17.x; pg_dump version 16.x` — `postgresql@17`'s bin
  isn't first on `PATH`; fix that (see Prerequisites) and re-run.

### Step 2 — storage files

```bash
node migration/migrate-storage.mjs
```

Recreates the `garment-images` bucket on the new project and copies every
object with identical paths. Idempotent — re-run to retry failures.

### Step 3 — rewrite stored URLs

```bash
source migration/.env.migration
psql "$NEW_DB_URL" -f migration/rewrite-urls.sql
```

Swaps `lpkasszpjklrmwugeupp.supabase.co` → `uzhdhxfcvptgowkuupmz.supabase.co`
in `products.images` / `description` / `size_chart` and `orders`/`carts`/
`app_settings` JSON. The final `SELECT` must report **0**.

### Step 4 — verify

```bash
node migration/verify.mjs
```

Row counts (old vs new) for every app table, auth user counts, storage object
counts, and live HEAD checks on new image URLs. Exit 0 = safe to cut over.

Also glance at the new dashboard: Authentication → Users (count matches),
Table editor (products/orders look right), Storage (images render).

> **Steps 5–8 in detail:** see [CUTOVER.md](./CUTOVER.md) — the Google OAuth
> walkthrough (Google Cloud Console + Supabase), the `.env.local` /
> `.env.local.singapore` / `.env.local.mumbai` switch, Vercel env, smoke test,
> and rollback.

### Step 5 — reconfigure auth on the new project

- Authentication → Providers → Google: paste the client id
  (`340733671044-...` from `.env.local` `GOOGLE_CLIENT_ID`) and its secret.
- Authentication → URL Configuration → Site URL + Redirect URLs: your prod
  domain and `http://localhost:3000`.
- Google Cloud Console → the OAuth 2.0 Client → Authorized redirect URIs → add
  `https://uzhdhxfcvptgowkuupmz.supabase.co/auth/v1/callback` (keep the old one
  until the old project is deleted).

### Step 6 — point the app at Mumbai

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://uzhdhxfcvptgowkuupmz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<new project's publishable / anon key>
DATABASE_URL=<new project's session-pooler URI, password url-encoded>
```

Vercel (Project → Settings → Environment Variables — update all envs, then
redeploy):
```bash
vercel env rm  NEXT_PUBLIC_SUPABASE_URL production && vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env rm  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production && vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env rm  DATABASE_URL production && vercel env add DATABASE_URL production
# repeat for preview / development envs as needed
```

`vercel.json` already pins `"regions": ["bom1"]` — leave it; that's Mumbai,
which is now correct.

Source refs to the old project (cosmetic — only the offline fallback catalog
and an old script):
- `src/lib/db.ts` — `SEED_PRODUCTS` image URLs (`lpkasszpjklrmwugeupp`)
- `src/scripts/migrate.js`

### Step 7 — post-cutover smoke test

- Google sign-in works; an existing user still has their profile/orders.
- Product grid + product detail images load.
- Admin: add a product, edit one, delete one; check Storage on the new project.
- Place a test order end to end (Razorpay is unaffected).
- Watch Vercel logs for Supabase errors.

### Step 8 — decommission

After a few days stable: pause, then delete the old Singapore project. Remove
`migration/.env.migration` and `migration/dump/`.

---

## Rollback

Nothing is destructive until Step 6. If something's wrong after cutover, put
the three env vars (local + Vercel) back to the `lpkasszpjklrmwugeupp` values
and redeploy — the old project is untouched and still live. Re-attempt the
migration later.
