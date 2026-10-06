// Runs ONE .sql file against the database in DATABASE_URL (.env.local).
//
//   npm run sql -- supabase/migrations/20261006000000_galla_barcode_from_sku.sql
//
// Unlike `npm run migrate` (supabase db push), this doesn't consult or touch
// Supabase's migration history — some migrations were applied to the live DB
// by hand, so a push can try to re-run old ones. The file runs as a single
// transaction and stops at the first error, so it either fully applies or
// changes nothing.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const file = process.argv[2];
if (!file || !file.endsWith('.sql') || !fs.existsSync(file)) {
  console.error('\x1b[31mUsage: npm run sql -- <path/to/file.sql>\x1b[0m');
  process.exit(1);
}

const envPath = path.join(process.cwd(), '.env.local');
const match = fs.existsSync(envPath) && fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*(.*)$/m);
const databaseUrl = match ? match[1].trim().replace(/['"]/g, '') : '';
if (!databaseUrl) {
  console.error('\x1b[31mError: DATABASE_URL is not set in .env.local\x1b[0m');
  process.exit(1);
}

if (spawnSync('psql', ['--version']).error) {
  console.error('\x1b[31mError: psql not found. Install it with: brew install libpq && brew link --force libpq\x1b[0m');
  process.exit(1);
}

const host = (databaseUrl.match(/@([^:/?]+)/) || [])[1] || 'unknown host';
console.log(`\n\x1b[36mFile:\x1b[0m     ${file}`);
console.log(`\x1b[36mDatabase:\x1b[0m ${host}\n`);
console.log(fs.readFileSync(file, 'utf8'));

const run = () => {
  const result = spawnSync(
    'psql',
    [databaseUrl, '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', file],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    console.error('\x1b[31m✕ Failed — the transaction was rolled back, nothing was changed.\x1b[0m');
    process.exit(1);
  }
  console.log('\x1b[32m✓ Applied.\x1b[0m');
};

if (process.argv.includes('--yes')) {
  run();
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`Run this against ${host}? (y/N) `, answer => {
    rl.close();
    if (answer.trim().toLowerCase() === 'y') run();
    else console.log('Cancelled.');
  });
}
