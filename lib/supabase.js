import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rhhcvtccajpjcjqmprrl.supabase.co";
const supabaseAnonKey = "sb_publishable_ltaNA7nnVozoSCOcZIjg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);