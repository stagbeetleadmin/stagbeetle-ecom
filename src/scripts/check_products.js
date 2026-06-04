const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)$/m);
  if (urlMatch && urlMatch[1]) {
    supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
  }
  const keyMatch = envContent.match(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.*)$/m);
  if (keyMatch && keyMatch[1]) {
    supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  try {
    console.log("Fetching products from Supabase...");
    const { data, error } = await supabase.from('products').select('id, title, category, subcategory, sleeve_type, sku');
    if (error) {
      console.error("Error fetching products:", error);
      return;
    }
    console.log(`Found ${data.length} products:`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to run check:", err);
  }
}

checkProducts();
