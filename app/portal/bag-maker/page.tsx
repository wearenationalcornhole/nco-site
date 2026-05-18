export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import BagMakerClient from '@/app/portal/bag-maker/BagMakerClient'
import { getCustomBagPriceCents } from '@/app/lib/bagMakerConfig'
import { canUseOrganizerTools, isProfileReadyForPortal, type ProfileRole } from '@/app/lib/profileCapabilities'
import { getSupabaseServer } from '@/app/lib/supabaseServer'

export default async function BagMakerPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fbag-maker')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_profile_complete, first_name, last_name, organization, city, region')
    .eq('id', user.id)
    .maybeSingle()

  if (!isProfileReadyForPortal(profile)) {
    redirect('/portal/onboarding?debug=incomplete_profile')
  }

  const role = (profile?.role ?? 'player') as ProfileRole
  if (!canUseOrganizerTools(role)) {
    redirect('/portal/dashboard?error=bag_maker_requires_organizer_access')
  }

  return <BagMakerClient role={role} bagPriceCents={getCustomBagPriceCents()} />
}

