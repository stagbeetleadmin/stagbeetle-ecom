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

async function normalizeSubcategories() {
  try {
    console.log("Updating subcategories in Supabase products table...");
    const { data, error } = await supabase
      .from('products')
      .update({ subcategory: 'Shirt' })
      .in('subcategory', ['Premium Cotton Shirt', 'Classic Cotton Shirt'])
      .select('id, title, subcategory');
    
    if (error) {
      console.error("Error updating subcategories:", error);
      return;
    }
    
    console.log(`Successfully normalized ${data.length} products to 'Shirt' subcategory:`);
    console.log(data);
  } catch (err) {
    console.error("Failed to run normalization:", err);
  }
}

normalizeSubcategories();
