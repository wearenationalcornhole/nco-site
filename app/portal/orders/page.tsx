export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import OrdersClient from '@/app/portal/orders/OrdersClient'

export default async function OrdersPage() {
  const supabase = await getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Forders')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_profile_complete')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.role) redirect('/portal/onboarding')
  if (!profile?.is_profile_complete) redirect('/portal/onboarding/profile')

  return <OrdersClient />
}
