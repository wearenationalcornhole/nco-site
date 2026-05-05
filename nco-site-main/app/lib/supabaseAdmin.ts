// Server-only Supabase client (service role) for uploads & DB ops
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey } from '@/app/lib/site'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = getSupabaseServiceRoleKey()

if (!serviceKey) {
  throw new Error('Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY.')
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
