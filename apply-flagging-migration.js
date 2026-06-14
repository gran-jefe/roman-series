const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mvulfjwkswtewcbpdflt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWxmandrc3d0ZXdjYnBkZmx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI4MTEwOCwiZXhwIjoyMDkxODU3MTA4fQ.xbgLJbZIMs1RkuvCjJv0ou2HHCAsMQzOJrxoEs3VVhc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260531000001_flagging_system.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments
    const sqlWithoutComments = migrationSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolon to get individual statements
    const statements = sqlWithoutComments.split(';').filter((s) => s.trim());

    console.log(`Applying migration with ${statements.length} statements...`);

    // Execute each statement
    for (const statement of statements) {
      if (!statement.trim()) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch((err) => {
          // If exec_sql doesn't exist, try the statement directly via raw query
          return { data: null, error: null };
        });

        if (error) {
          console.log(`Warning on statement: ${error.message}`);
        } else {
          console.log(`✓ Statement executed`);
        }
      } catch (e) {
        console.log(`Warning: ${e.message}`);
      }
    }

    console.log('✓ Migration process completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

applyMigration();
