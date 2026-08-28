#!/usr/bin/env node
//
// Stage 2 of the Supabase Singapore → Mumbai migration.
//
// Copies every object in the configured storage buckets from the OLD project
// to the NEW one, preserving bucket names and object paths so the
// storage.objects metadata rows restored in stage 1 match real files.
//
// Idempotent: uploads use upsert, so a re-run re-copies without erroring and
// picks up anything that failed the first time.
//
// Run from the repo root:  node migration/migrate-storage.mjs
//
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// ── tiny .env.migration parser (avoids a dotenv dependency) ─────────────────
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
      const end = v.indexOf(v[0], 1);           // take up to the closing quote; ignore trailing comments
      v = end === -1 ? v.slice(1) : v.slice(1, end);
    } else {
      const c = v.indexOf(' #');                // strip an inline comment on a bare value
      if (c !== -1) v = v.slice(0, c).trim();
    }
    if (!(key in process.env)) process.env[key] = v;
  }
}
loadEnv(join(here, '.env.migration'));

const {
  OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY,
  NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY,
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

const PAGE = 100;        // storage list() page size
const CONCURRENCY = 8;   // parallel file copies

// storage.list() returns folders as entries with a null id — recurse into them.
async function listFolder(client, bucket, prefix) {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`list ${bucket}/${prefix || ''}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id == null) files.push(...await listFolder(client, bucket, path));
      else files.push(path);
    }
    if (data.length < PAGE) break;
  }
  return files;
}

async function ensureBucket(bucket) {
  const { data: existing } = await newC.storage.getBucket(bucket);
  if (existing) return;
  const { data: src } = await oldC.storage.getBucket(bucket);
  const { error } = await newC.storage.createBucket(bucket, {
    public: src?.public ?? true,
    fileSizeLimit: src?.file_size_limit ?? null,
    allowedMimeTypes: src?.allowed_mime_types ?? null,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`   created bucket "${bucket}" (public=${src?.public ?? true})`);
}

async function copyOne(bucket, path) {
  const { data: blob, error: dErr } = await oldC.storage.from(bucket).download(path);
  if (dErr) throw new Error(`download: ${dErr.message}`);
  const buf = Buffer.from(await blob.arrayBuffer());
  const { error: uErr } = await newC.storage.from(bucket).upload(path, buf, {
    upsert: true,
    contentType: blob.type || undefined,
  });
  if (uErr) throw new Error(`upload: ${uErr.message}`);
}

async function run() {
  for (const bucket of BUCKETS.split(',').map(s => s.trim()).filter(Boolean)) {
    console.log(`\n=== ${bucket} ===`);
    await ensureBucket(bucket);

    const files = await listFolder(oldC, bucket, '');
    console.log(`   ${files.length} files to copy`);

    let done = 0, failed = 0;
    const queue = [...files];
    const worker = async () => {
      for (;;) {
        const path = queue.shift();
        if (path === undefined) return;
        try {
          await copyOne(bucket, path);
          done++;
        } catch (e) {
          failed++;
          console.warn(`   FAIL ${path} — ${e.message}`);
        }
        if ((done + failed) % 25 === 0 || done + failed === files.length) {
          console.log(`   ${done + failed}/${files.length} (${failed} failed)`);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(`   done: ${done} copied, ${failed} failed`);
    if (failed) process.exitCode = 1;
  }
  console.log('\n✓ Storage copy finished.');
  console.log('  Next:  psql "$NEW_DB_URL" -f migration/rewrite-urls.sql   (README step 3)');
}

run().catch(e => { console.error(e); process.exit(1); });
