export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import Client from '@/app/portal/players/Client'

export default async function MyRegistrationsPage() {
  const supabase = await getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fmy-registrations')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_profile_complete, first_name, last_name, organization, city, region')
    .eq('id', user.id)
    .maybeSingle()

  const hasRequiredBasics =
    Boolean(profile?.role) &&
    Boolean(profile?.first_name) &&
    Boolean(profile?.last_name) &&
    Boolean(profile?.city) &&
    Boolean(profile?.region) &&
    (profile?.role !== 'organizer' || Boolean(profile?.organization))

  if (!hasRequiredBasics) {
    redirect('/portal/onboarding?debug=incomplete_profile')
  }

  return <Client />
}
