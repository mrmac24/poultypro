import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: Log connection status
console.log('Supabase URL configured:', supabaseUrl ? 'Yes' : 'No')
console.log('Supabase Key configured:', supabaseAnonKey ? 'Yes' : 'No')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Supabase credentials not configured!')
  console.error('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
  }
)

// Test connection
supabase.from('flocks').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error.message)
    } else {
      console.log('✓ Supabase connection successful')
    }
  })