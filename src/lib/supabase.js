import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wblumhrmsihjaruztlxf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OANejQqwHtL4mVZOUC96Lg_6GJKNTnY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
