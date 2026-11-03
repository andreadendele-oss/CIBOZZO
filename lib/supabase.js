import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rhhcvtccajpjcjqmprrl.supabase.co";
const supabaseAnonKey = "sb_publishable_l5oyk1fYvz3OS0REIZjfJA_nfH0gotE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);