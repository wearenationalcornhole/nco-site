export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import StoreAdminClient from './StoreAdminClient'

export default async function AdminStorePage() {
  const supabase = await getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fadmin%2Fstore')
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'admin') {
    redirect('/portal/dashboard')
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">Store Ops</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#0A3161]">Store Catalog Manager</h1>
        </div>
      </div>
      <StoreAdminClient />
    </main>
  )
}
