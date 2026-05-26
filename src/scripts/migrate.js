const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(process.cwd(), '.env.local');
let databaseUrl = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  // Match both DATABASE_URL and next-style env variables if any
  const match = envContent.match(/^DATABASE_URL\s*=\s*(.*)$/m);
  if (match && match[1]) {
    databaseUrl = match[1].trim().replace(/['"]/g, '');
  }
}

if (!databaseUrl) {
  console.error("\x1b[31mError: DATABASE_URL is not set in .env.local\x1b[0m");
  console.log("\nPlease add your database connection string (DSN) to your \x1b[33m.env.local\x1b[0m file.");
  console.log("You can copy it from your Supabase Dashboard under \x1b[36mProject Settings > Database > Connection string (select URI tab)\x1b[0m.");
  console.log("\nExample entry for \x1b[33m.env.local\x1b[0m:");
  console.log("\x1b[32mDATABASE_URL=postgresql://postgres:[YOUR-DATABASE-PASSWORD]@db.lpkasszpjklrmwugeupp.supabase.co:5432/postgres\x1b[0m\n");
  process.exit(1);
}

try {
  console.log("\x1b[36mPushing migrations to Supabase database...\x1b[0m");
  execSync(`npx supabase db push --db-url "${databaseUrl}"`, { stdio: 'inherit' });
  console.log("\x1b[32m✓ Database migrations successfully applied!\x1b[0m");
} catch (e) {
  console.error("\x1b[31m✕ Migration push failed. Make sure your database password is correct and your connection string is valid.\x1b[0m");
  process.exit(1);
}
