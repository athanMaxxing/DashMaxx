import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[DashMaxx] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. Fill in .env.local and restart the dev server.',
  )
}

// Fall back to a placeholder so the app can still render a helpful message instead of crashing.
export const supabase = createClient(
  supabaseUrl || 'http://localhost.invalid',
  supabaseAnonKey || 'missing-anon-key',
)
