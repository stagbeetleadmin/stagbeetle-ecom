#!/usr/bin/env bash
#
# Re-sync the NEW project's DATA from OLD. The schema is already migrated and
# verified identical, so this only wipes NEW's tables and reloads rows.
#
# Use this RIGHT BEFORE the real cutover, AFTER you've frozen writes on the OLD
# (Singapore) project — it discards any test writes made against NEW while you
# were trying the preview, and picks up anything OLD gained since migrate-db.sh.
#
#     ./migration/reimport-data.sh
#
# Not needed if migrate-db.sh was only just run and nothing has written to
# either project since.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/.env.migration" ] || { echo "!! migration/.env.migration not found"; exit 1; }
# shellcheck disable=SC1091
set -a; . "$SCRIPT_DIR/.env.migration"; set +a
: "${OLD_DB_URL:?set OLD_DB_URL}"
: "${NEW_DB_URL:?set NEW_DB_URL}"

hint='brew install postgresql@17 && export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"'
command -v pg_dump >/dev/null 2>&1 || { echo "!! pg_dump not found. $hint"; exit 1; }
[ "$(pg_dump --version | grep -oE '[0-9]+' | head -1)" -ge 17 ] || { echo "!! need pg_dump v17. $hint"; exit 1; }

read -r -p $'This WIPES every row in the Mumbai project and reloads from Singapore.\nHave you frozen writes on Singapore? Type "reimport" to proceed: ' ok
[ "$ok" = "reimport" ] || { echo "aborted."; exit 1; }

DUMP_DIR="$SCRIPT_DIR/dump"
mkdir -p "$DUMP_DIR"
COMMON=(--data-only --no-owner --no-privileges --quote-all-identifiers)

echo "==> [1/5] dump auth data from OLD"
pg_dump "$OLD_DB_URL" "${COMMON[@]}" --table=auth.users --table=auth.identities -f "$DUMP_DIR/data-auth.sql"

echo "==> [2/5] dump public data from OLD"
pg_dump "$OLD_DB_URL" "${COMMON[@]}" --schema=public -f "$DUMP_DIR/data-public.sql"

echo "==> [3/5] wipe NEW (public tables + auth.users/identities)"
psql "$NEW_DB_URL" --single-transaction -v ON_ERROR_STOP=1 <<'SQL'
SET session_replication_role = replica;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('TRUNCATE public.%I RESTART IDENTITY CASCADE', t);
  END LOOP;
END $$;
TRUNCATE auth.identities CASCADE;
TRUNCATE auth.users CASCADE;
SQL

echo "==> [4/5] reload from OLD dump"
psql "$NEW_DB_URL" --single-transaction -v ON_ERROR_STOP=1 \
  --command "SET session_replication_role = replica;" \
  --file "$DUMP_DIR/data-auth.sql" \
  --file "$DUMP_DIR/data-public.sql"

echo "==> [5/5] rewrite image URLs + re-copy storage (idempotent)"
psql "$NEW_DB_URL" -f "$SCRIPT_DIR/rewrite-urls.sql"
( cd "$SCRIPT_DIR/.." && node migration/migrate-storage.mjs )

echo
echo "✓ Re-sync complete. Verify:  node migration/verify.mjs"
