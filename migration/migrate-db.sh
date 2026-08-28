#!/usr/bin/env bash
#
# Stage 1 of the Supabase Singapore -> Mumbai migration.
# Plain pg_dump / psql — no Docker, no Supabase CLI.
#
# Brings across:
#   - public schema DDL: tables, indexes, RLS policies, functions, grants, sequences
#   - all public table data
#   - auth.users + auth.identities   (so existing password + Google logins keep working)
#
# NOT carried (recreate by hand if you rely on them — see README):
#   - the trigger on auth.users that auto-inserts a profiles row
#     (the app's AuthContext already upserts a profile on first login)
#   - the rls_auto_enable event trigger (every table's RLS is set explicitly
#     in the schema dump anyway)
#   - storage.objects rows — migrate-storage.mjs recreates them on upload
#
# Schema restore is lenient (Supabase-managed privilege lines are expected to
# no-op/complain); data restore is strict and transactional. Re-runnable.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/.env.migration" ]; then
  echo "!! migration/.env.migration not found."
  echo "   cp migration/env.migration.example migration/.env.migration  and fill it in."
  exit 1
fi
# shellcheck disable=SC1091
set -a; . "$SCRIPT_DIR/.env.migration"; set +a
: "${OLD_DB_URL:?set OLD_DB_URL in .env.migration}"
: "${NEW_DB_URL:?set NEW_DB_URL in .env.migration}"

hint='brew install postgresql@17 && export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"'
command -v pg_dump >/dev/null 2>&1 || { echo "!! pg_dump not found.  $hint"; exit 1; }
command -v psql    >/dev/null 2>&1 || { echo "!! psql not found.  $hint"; exit 1; }
DUMP_MAJOR="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
if [ "${DUMP_MAJOR:-0}" -lt 17 ]; then
  echo "!! pg_dump is v${DUMP_MAJOR}; servers are PG 17. Put v17 first on PATH:"
  echo "   export PATH=\"/opt/homebrew/opt/postgresql@17/bin:\$PATH\""
  exit 1
fi

DUMP_DIR="$SCRIPT_DIR/dump"
mkdir -p "$DUMP_DIR"

COMMON=(--no-owner --no-privileges --quote-all-identifiers)

echo "==> [1/5] dump schema (public DDL)"
pg_dump "$OLD_DB_URL" --schema-only --quote-all-identifiers --no-owner \
  --schema=public -f "$DUMP_DIR/schema.sql"

# The target already has schema public; and it isn't ours to re-comment.
sed -i '' \
  -e 's/^CREATE SCHEMA "public";/CREATE SCHEMA IF NOT EXISTS "public";/' \
  -e '/^COMMENT ON SCHEMA "public" IS/d' \
  "$DUMP_DIR/schema.sql"

echo "==> [2/5] dump auth data (auth.users + auth.identities)"
pg_dump "$OLD_DB_URL" --data-only "${COMMON[@]}" \
  --table=auth.users --table=auth.identities -f "$DUMP_DIR/data-auth.sql"

echo "==> [3/5] dump public data (all public tables)"
pg_dump "$OLD_DB_URL" --data-only "${COMMON[@]}" \
  --schema=public -f "$DUMP_DIR/data-public.sql"

echo "==> [4/5] restore schema into NEW  (lenient — managed-role GRANT noise is expected)"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=0 -q -f "$DUMP_DIR/schema.sql" 2>&1 \
  | grep -Ei '^psql.*(error|fatal)' | grep -viE 'already exists|must be (owner|member)|permission denied for schema|no such' \
  || true
TABLES_NOW="$(psql "$NEW_DB_URL" -tAc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")"
echo "    public tables now on NEW: $TABLES_NOW  (expect 11)"
if [ "${TABLES_NOW:-0}" -lt 11 ]; then
  echo "!! schema restore is incomplete — inspect migration/dump/schema.sql output above. Aborting."
  exit 1
fi

echo "==> [5/5] restore data into NEW  (strict, one transaction, FK/trigger checks deferred)"
psql "$NEW_DB_URL" \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command "SET session_replication_role = replica;" \
  --file "$DUMP_DIR/data-auth.sql" \
  --file "$DUMP_DIR/data-public.sql"

echo
echo "✓ Database restored into the Mumbai project."
echo "  Next:  node migration/migrate-storage.mjs"
