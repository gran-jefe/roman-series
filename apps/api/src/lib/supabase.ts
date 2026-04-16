import { createClient } from "@supabase/supabase-js";
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

/**
 * Supabase Admin Client
 * Uses service role key for server-side operations with full access
 * Use this for operations that bypass RLS policies
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Supabase Anon Client
 * Uses anon key for client-side operations
 * Respects RLS policies and is safe for browser use
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabaseAdmin;
