'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function WhoAmI() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setEmail(user?.email ?? null)
      } catch (e: any) {
        setErr(e?.message || 'no session')
      }
    }
    run()
  }, [supabase])

  return (
    <main className="min-h-screen grid place-items-center p-10">
      <div>
        <h1>whoami</h1>
        <pre>Email: {email ?? '(none)'}</pre>
        {err && <pre style={{color:'red'}}>Error: {err}</pre>}
      </div>
    </main>
  )
}