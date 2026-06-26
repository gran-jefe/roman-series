// Polyfill WebSocket for Node.js < 22
import WebSocket from 'ws'
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// Disable realtime entirely - not needed in the API server
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: -1,
    },
  },
  global: {
    headers: {
      'x-application-name': 'roman-series-api',
    },
  },
})

// Prevent realtime from initializing by not calling channel()
// The API only needs database queries, not realtime subscriptions
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

export default supabaseAdmin

/**
 * Batch query helper to avoid HeadersOverflowError
 * Splits large ID arrays into smaller batches for Supabase .in() queries
 * Supabase has URL length limits (~8KB), so batching prevents overflow
 */
export async function batchQuery<T>(
  tableName: string,
  idColumn: string,
  ids: string[],
  selectFields: string = "*",
  batchSize: number = 50
): Promise<T[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  console.log(
    `[batchQuery] Fetching ${ids.length} IDs from ${tableName} (${idColumn}) in batches of ${batchSize}`
  );

  const results: T[] = [];
  const totalBatches = Math.ceil(ids.length / batchSize);

  for (let i = 0; i < ids.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = ids.slice(i, i + batchSize);

    console.log(
      `[batchQuery] Fetching batch ${batchNum}/${totalBatches} (${batch.length} IDs)`
    );

    try {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select(selectFields)
        .in(idColumn, batch);

      if (error) {
        console.error(
          `[batchQuery] Error fetching batch ${batchNum} from ${tableName}:`,
          error
        );
        continue;
      }

      if (data) {
        results.push(...(data as T[]));
      }
    } catch (err) {
      console.error(`[batchQuery] Exception on batch ${batchNum}:`, err);
      continue;
    }
  }

  console.log(
    `[batchQuery] Completed: fetched ${results.length} total records from ${tableName}`
  );
  return results;
}
