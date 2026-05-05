'use client'

import Button from '@/components/ui/Button'
import { supabase } from '@/app/lib/supabaseClient'

export default function SignOutButton() {
  async function signOut() {
    await supabase.auth.signOut()
    location.href = '/portal' // or refresh
  }

  return (
    <Button variant="outline" onClick={signOut}>
      Sign out
    </Button>
  )
}