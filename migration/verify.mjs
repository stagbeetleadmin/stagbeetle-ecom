#!/usr/bin/env node
//
// Stage 4 of the Supabase Singapore → Mumbai migration: sanity-check the copy.
//
//   * per-table row counts, OLD vs NEW
//   * auth user counts, OLD vs NEW
//   * storage object counts per bucket, OLD vs NEW
//   * HEAD-checks a handful of product image URLs on the NEW project and
//     confirms they carry the NEW ref, not the old one
//
// Run from the repo root:  node migration/verify.mjs
// Exit code is non-zero if any count differs or any image URL check fails.
//
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    console.error(`!! ${file} not found — run: cp migration/env.migration.example migration/.env.migration`);
    process.exit(1);
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    let v = line.slice(eq + 1).trim();
    if (v[0] === '"' || v[0] === "'") {
      const end = v.indexOf(v[0], 1);
      v = end === -1 ? v.slice(1) : v.slice(1, end);
    } else {
      const c = v.indexOf(' #');
      if (c !== -1) v = v.slice(0, c).trim();
    }
    if (!(key in process.env)) process.env[key] = v;
  }
}
loadEnv(join(here, '.env.migration'));

const {
  OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY,
  NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY,
  OLD_REF = 'lpkasszpjklrmwugeupp',
  NEW_REF = 'uzhdhxfcvptgowkuupmz',
  BUCKETS = 'garment-images',
} = process.env;

for (const [k, v] of Object.entries({ OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY })) {
  if (!v) {
    console.error(`!! ${k} is not set in migration/.env.migration`);
    process.exit(1);
  }
}

const oldC = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const newC = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Tables the app reads/writes (src/lib/db.ts). Missing tables report "n/a".
const TABLES = [
  'products', 'product_variants', 'inventory', 'inventory_sync_log',
  'orders', 'coupons', 'app_settings', 'profiles', 'carts', 'members',
];

let problems = 0;

async function tableCount(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) return error.message.match(/does not exist|not find the table/i) ? 'n/a' : `ERR`;
  return count ?? 0;
}

async function userCount(client) {
  let page = 1, total = 0;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return `ERR(${error.message})`;
    total += data.users.length;
    if (data.users.length < 1000) break;
    page++;
  }
  return total;
}

const PAGE = 100;
async function storageCount(client, bucket, prefix = '') {
  let total = 0;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) return `ERR(${error.message})`;
    if (!data || data.length === 0) break;
    for (const e of data) {
      if (e.id == null) {
        const sub = await storageCount(client, bucket, prefix ? `${prefix}/${e.name}` : e.name);
        total += typeof sub === 'number' ? sub : 0;
      } else {
        total += 1;
      }
    }
    if (data.length < PAGE) break;
  }
  return total;
}

function row(label, a, b) {
  const same = a === b;
  if (!same) problems++;
  console.log(
    `${same ? 'ok ' : 'XX '} ${label.padEnd(24)} old=${String(a).padStart(8)}   new=${String(b).padStart(8)}`,
  );
}

console.log('\n── table row counts ─────────────────────────────────────────────');
for (const t of TABLES) {
  const [a, b] = await Promise.all([tableCount(oldC, t), tableCount(newC, t)]);
  row(t, a, b);
}

console.log('\n── auth users ───────────────────────────────────────────────────');
{
  const [a, b] = await Promise.all([userCount(oldC), userCount(newC)]);
  row('auth.users', a, b);
}

console.log('\n── storage objects ──────────────────────────────────────────────');
for (const bucket of BUCKETS.split(',').map(s => s.trim()).filter(Boolean)) {
  const [a, b] = await Promise.all([storageCount(oldC, bucket), storageCount(newC, bucket)]);
  row(bucket, a, b);
}

console.log('\n── product image URLs on NEW project ───────────────────────────');
{
  const { data, error } = await newC
    .from('products')
    .select('id,images')
    .not('images', 'is', null)
    .limit(8);
  if (error) {
    console.log(`XX  could not read products: ${error.message}`);
    problems++;
  } else {
    const urls = data.flatMap(p => (p.images || []).slice(0, 1)).filter(Boolean).slice(0, 6);
    for (const url of urls) {
      if (url.includes(OLD_REF)) {
        console.log(`XX  still points at OLD ref: ${url}`);
        problems++;
        continue;
      }
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const ok = res.status === 200 && url.includes(NEW_REF);
        if (!ok) problems++;
        console.log(`${ok ? 'ok ' : 'XX '} ${res.status}  ${url}`);
      } catch (e) {
        problems++;
        console.log(`XX  fetch failed (${e.message})  ${url}`);
      }
    }
  }
}

console.log('\n────────────────────────────────────────────────────────────────');
if (problems === 0) {
  console.log('✓ all checks passed — safe to cut the app over (README step 5).');
} else {
  console.log(`✗ ${problems} check(s) failed — see the XX lines above before cutting over.`);
  process.exit(1);
}
