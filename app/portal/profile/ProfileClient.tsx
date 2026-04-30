'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  deriveDisplayName,
  PROFILE_VISIBILITY_OPTIONS,
  readCommunityProfileMetadata,
  SKILL_LEVEL_OPTIONS,
  splitDisplayName,
  type ProfileVisibility,
  type SkillLevel,
} from '@/app/lib/communityProfile'

type ProfileRow = {
  role: string | null
  first_name: string | null
  last_name: string | null
  city: string | null
  region: string | null
  avatar_url: string | null
  is_profile_complete: boolean | null
}

export default function ProfileClient() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string>('player')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    displayName: '',
    location: '',
    region: '',
    favoriteBag: '',
    skillLevel: 'intermediate' as SkillLevel,
    profileVisibility: 'members' as ProfileVisibility,
  })

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          router.replace('/portal/login?redirect=%2Fportal%2Fprofile')
          return
        }

        if (!alive) return
        setEmail(user.email ?? null)

        const meta = readCommunityProfileMetadata(user)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role,first_name,last_name,city,region,avatar_url,is_profile_complete')
          .eq('id', user.id)
          .maybeSingle<ProfileRow>()

        if (profileError) throw profileError
        if (!alive) return

        setRole(profile?.role ?? 'player')
        setAvatarUrl(profile?.avatar_url ?? null)
        setNeedsOnboarding(!profile?.role || !profile?.is_profile_complete)
        setForm({
          displayName: deriveDisplayName({
            displayName: meta.display_name,
            firstName: profile?.first_name,
            lastName: profile?.last_name,
            fallback: user.email?.split('@')[0] ?? 'NCO Member',
          }),
          location: profile?.city ?? '',
          region: profile?.region ?? '',
          favoriteBag: meta.favorite_bag,
          skillLevel: meta.skill_level,
          profileVisibility: meta.profile_visibility,
        })
        setLoading(false)
      } catch (err: any) {
        console.error('portal profile load error', err)
        if (!alive) return
        setError(err?.message || 'Failed to load your profile')
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [router, supabase])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        router.replace('/portal/login?redirect=%2Fportal%2Fprofile')
        return
      }

      if (!form.displayName.trim()) {
        throw new Error('Display name is required.')
      }

      const { firstName, lastName } = splitDisplayName(form.displayName)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          city: form.location.trim() || null,
          region: form.region.trim() || null,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata ?? {}),
          display_name: form.displayName.trim(),
          favorite_bag: form.favoriteBag.trim(),
          skill_level: form.skillLevel,
          profile_visibility: form.profileVisibility,
        },
      })

      if (authError) throw authError

      setMessage('Profile updated.')
    } catch (err: any) {
      console.error('portal profile save error', err)
      setError(err?.message || 'Could not update your profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        Loading profile…
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl py-2">
      <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl || '/images/nco-mark.png'}
              alt=""
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                Portal Profile
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Manage your community identity.
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {email ?? 'Signed-in member'} · Role: <strong>{role}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/portal/dashboard"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/players"
              className="rounded-full bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              View Player Directory
            </Link>
          </div>
        </div>

        {needsOnboarding && (
          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Your account still needs the full onboarding fields used by the existing portal flow.
            <Link href="/portal/onboarding" className="ml-2 font-semibold underline">
              Complete onboarding
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-[1.5rem] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={submit} className="mt-8 grid gap-8">
          <section className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Display name"
              value={form.displayName}
              onChange={(value) => update('displayName', value)}
              required
              placeholder="How players should know you"
            />
            <Field
              label="Favorite bag"
              value={form.favoriteBag}
              onChange={(value) => update('favoriteBag', value)}
              placeholder="Flashpoint Pro, Operator Elite, etc."
            />
            <Field
              label="Location"
              value={form.location}
              onChange={(value) => update('location', value)}
              placeholder="City"
            />
            <Field
              label="Region"
              value={form.region}
              onChange={(value) => update('region', value)}
              placeholder="State or region"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Skill level</span>
              <select
                value={form.skillLevel}
                onChange={(event) => update('skillLevel', event.target.value as SkillLevel)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
              >
                {SKILL_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="rounded-[1.5rem] border border-slate-200 p-5">
              <legend className="px-2 text-sm font-medium text-slate-700">Profile visibility</legend>
              <div className="mt-2 space-y-3">
                {PROFILE_VISIBILITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <input
                      type="radio"
                      name="profileVisibility"
                      value={option.value}
                      checked={form.profileVisibility === option.value}
                      onChange={() => update('profileVisibility', option.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#B31942] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <p className="text-sm text-slate-500">
              Club follow and join requests will be added after the community schema pass.
            </p>
          </div>
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
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
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
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
      />
    </label>
  )
}
