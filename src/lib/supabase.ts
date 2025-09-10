import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Debug logs to help diagnose Netlify build issues
console.log('🔍 Supabase Debug Info:')
console.log('  VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('  VITE_SUPABASE_ANON_KEY (raw):', import.meta.env.VITE_SUPABASE_ANON_KEY ? '[SET]' : '[NOT SET]')
console.log('  Final supabaseUrl:', supabaseUrl)
console.log('  Final supabaseAnonKey:', supabaseAnonKey ? '[SET]' : '[NOT SET]')

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
  console.warn('Supabase environment variables are not properly configured. Please ensure your database connection variables are set.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
