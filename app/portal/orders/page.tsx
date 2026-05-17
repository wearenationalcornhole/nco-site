export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import { isProfileReadyForPortal } from '@/app/lib/profileCapabilities'
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
    .select('role, is_profile_complete, first_name, last_name, organization, city, region')
    .eq('id', user.id)
    .maybeSingle()

  if (!isProfileReadyForPortal(profile)) {
    redirect('/portal/onboarding?debug=incomplete_profile')
  }

  return <OrdersClient />
}
