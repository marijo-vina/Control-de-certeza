import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iepyxpocxajyiaounahn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_YS0WOk63uwHoXzoWIFQoiQ_dE039on2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
