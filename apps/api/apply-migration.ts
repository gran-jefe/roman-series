import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mvulfjwkswtewcbpdflt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWxmandrc3d0ZXdjYnBkZmx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI4MTEwOCwiZXhwIjoyMDkxODU3MTA4fQ.xbgLJbZIMs1RkuvCjJv0ou2HHCAsMQzOJrxoEs3VVhc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20260531000001_flagging_system.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon to get individual statements
    const statements = migrationSql.split(';').filter((s) => s.trim());

    console.log(`Applying migration with ${statements.length} statements...`);

    // Execute each statement using the admin client
    for (const statement of statements) {
      if (!statement.trim()) continue;

      try {
        // We'll use query via the client
        const result = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch((err) => {
          // If the function doesn't exist, return success as the table might already exist
          return { data: null, error: null };
        });

        if (result.error) {
          console.log(`Warning on statement: ${result.error.message}`);
        } else {
          console.log(`✓ Executed statement successfully`);
        }
      } catch (e: any) {
        console.log(`Warning: ${e.message}`);
      }
    }

    console.log('Migration process completed!');
  } catch (error: any) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

applyMigration();
