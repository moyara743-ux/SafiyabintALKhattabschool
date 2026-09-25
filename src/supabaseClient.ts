import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

export const supabaseUrl = 'https://acuahtbxqbumjcigoeff.supabase.co';
export const supabaseAnonKey = 'sb_publishable_yf0hT1dTf0f6I8u6765GMA_YJA5xArZ';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export type { SupabaseUser, Session };
export default supabase;
