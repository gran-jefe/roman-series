import { createClient } from "@supabase/supabase-js";
// @ts-ignore - WebSocket transport for Node.js < 22
import ws from "ws";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Log warning if missing (but don't crash - allows dev without Supabase credentials)
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.warn(
    "[supabase] Warning: Missing Supabase credentials. Auth endpoints will not work."
  );
}

// Configure WebSocket transport for Node.js < 22 (ws package required)
// @ts-ignore - WebSocket type compatibility
const clientOptions = {
  realtime: {
    transport: ws,
  },
};

/**
 * Supabase Admin Client
 * Uses service role key for server-side operations with full access
 * Use this for operations that bypass RLS policies
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, clientOptions as any);

/**
 * Supabase Anon Client
 * Uses anon key for client-side operations
 * Respects RLS policies and is safe for browser use
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions as any);

export default supabaseAdmin;

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
