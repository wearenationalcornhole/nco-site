export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { getAdminOverview } from '@/app/lib/adminOverview'

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<{ role: string | null }>()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const overview = await getAdminOverview()
    return NextResponse.json(overview)
  } catch (error: any) {
    console.error('GET /portal/api/admin/overview error:', error)
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 })
  }
}
