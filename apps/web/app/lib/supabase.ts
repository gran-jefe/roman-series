import { createClient } from "@supabase/supabase-js";
import { firebaseAuth } from "./firebase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

/**
 * Browser Supabase Client
 * Uses anon key for client-side operations
 * Trusts Firebase ID tokens for RLS-authenticated requests
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  },
});

export default supabase;
