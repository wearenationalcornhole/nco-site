'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/app/lib/supabaseBrowser'

type Role = 'player' | 'organizer' | 'admin'

type Club = {
  id: string
  name: string
}

type ProfileRow = {
  role: Role | null
  first_name: string | null
  last_name: string | null
  city: string | null
  region: string | null
  primary_club_id: string | null
  avatar_url: string | null
}

type Visibility = 'public' | 'members' | 'private'

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Competitive', 'Advanced'] as const

export default function ProfileEditorClient() {
  const router = useRouter()
  const [supabase] = useState(() => getSupabaseBrowser())

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('player')
  const [clubs, setClubs] = useState<Club[]>([])
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    city: '',
    region: '',
    primary_club_id: '',
    display_name: '',
    favorite_bag: '',
    skill_level: '',
    profile_visibility: 'members' as Visibility,
  })

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          router.replace('/portal/login?error=no_user_in_profile_editor&redirect=%2Fportal%2Fprofile')
          return
        }

        if (!alive) return
        setEmail(user.email ?? null)

        const [{ data: profile, error: profileError }, { data: clubRows, error: clubError }] = await Promise.all([
          supabase
            .from('profiles')
            .select('role,first_name,last_name,city,region,primary_club_id,avatar_url')
            .eq('id', user.id)
            .maybeSingle<ProfileRow>(),
          supabase.from('clubs').select('id,name').order('name', { ascending: true }),
        ])

        if (profileError) throw profileError
        if (clubError) throw clubError
        if (!alive) return

        const metadata = (user.user_metadata ?? {}) as Record<string, string | null | undefined>

        setRole((profile?.role as Role | null) ?? 'player')
        setClubs((clubRows ?? []) as Club[])
        setForm({
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          city: profile?.city ?? '',
          region: profile?.region ?? '',
          primary_club_id: profile?.primary_club_id ?? '',
          display_name: metadata.display_name ?? '',
          favorite_bag: metadata.favorite_bag ?? '',
          skill_level: metadata.skill_level ?? '',
          profile_visibility: (metadata.profile_visibility as Visibility | undefined) ?? 'members',
        })
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'Failed to load your profile.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [router, supabase])

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/portal/login?error=no_user_on_profile_editor_submit&redirect=%2Fportal%2Fprofile')
        return
      }

      if (!form.first_name || !form.last_name || !form.city || !form.region) {
        throw new Error('First name, last name, city, and region are required.')
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          city: form.city,
          region: form.region,
          primary_club_id: form.primary_club_id || null,
          is_profile_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: form.display_name || null,
          favorite_bag: form.favorite_bag || null,
          skill_level: form.skill_level || null,
          profile_visibility: form.profile_visibility,
        },
      })

      if (authError) throw authError

      setMessage('Profile updated.')
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save your profile right now.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <p>Loading profile editor…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">Portal Profile</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Community profile settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              {email ?? 'Signed-in member'} · role: {role}
            </p>
          </div>
          <Link href="/portal/dashboard" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            Back to dashboard
          </Link>
        </div>

        {message ? <p className="mt-6 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <form onSubmit={onSubmit} className="mt-8 grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={form.first_name} onChange={(value) => updateField('first_name', value)} required />
            <Field label="Last name" value={form.last_name} onChange={(value) => updateField('last_name', value)} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" value={form.display_name} onChange={(value) => updateField('display_name', value)} />
            <Field label="Favorite bag" value={form.favorite_bag} onChange={(value) => updateField('favorite_bag', value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" value={form.city} onChange={(value) => updateField('city', value)} required />
            <Field label="State / Region" value={form.region} onChange={(value) => updateField('region', value)} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Skill level</span>
              <select
                value={form.skill_level}
                onChange={(event) => updateField('skill_level', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="">Choose a level</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Profile visibility</span>
              <select
                value={form.profile_visibility}
                onChange={(event) => updateField('profile_visibility', event.target.value as Visibility)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="public">Public</option>
                <option value="members">Members only</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Club affiliation</span>
            <select
              value={form.primary_club_id}
              onChange={(event) => updateField('primary_club_id', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">Independent / no club selected</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              This uses the current `primary_club_id` profile field, which is the safest club-affiliation model in the current stack.
            </p>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-usaBlue px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
      />
    </label>
  )
}
