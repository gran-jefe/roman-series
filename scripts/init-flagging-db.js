#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://mvulfjwkswtewcbpdflt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { presence: 'off' },
  db: { schema: 'public' }
});

async function initializeFlaggingDb() {
  try {
    console.log('Initializing flagged_questions table...');

    // First, check if the table exists
    const { data: checkResult, error: checkError } = await supabase
      .from('flagged_questions')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✓ flagged_questions table already exists');
      return;
    }

    console.log('Table does not exist, attempting to create...');

    // Try to create using the postgres function approach
    // Since we can't run raw SQL directly, we'll need to use the migration file
    console.log('\nTo create the table, please run:');
    console.log('1. Go to Supabase Dashboard: https://app.supabase.com');
    console.log('2. Open your project (mvulfjwkswtewcbpdflt)');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy the contents of: supabase/migrations/20260531000001_flagging_system.sql');
    console.log('5. Paste and run in the SQL Editor');
    console.log('\nOr, if you have supabase CLI installed:');
    console.log('supabase db push --project-ref mvulfjwkswtewcbpdflt');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initializeFlaggingDb();
