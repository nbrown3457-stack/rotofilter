import { createClient } from '@supabase/supabase-js';

// 1. Load keys, or use "placeholder" strings if missing (prevents build crash)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// 2. Create the client
export const supabase = createClient(supabaseUrl, supabaseKey);