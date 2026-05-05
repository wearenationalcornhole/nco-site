export const revalidate = 0
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/app/lib/supabaseServer'
import ProfileEditorClient from './ProfileEditorClient'

export default async function PortalProfilePage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fprofile')
  }

  return <ProfileEditorClient userId={user.id} userEmail={user.email ?? null} />
}
