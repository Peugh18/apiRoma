import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This is the admin client with full access, meant for server-side only
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for public use (if needed, though this app mostly uses server actions/API)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side use (has full database access bypassing RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
