'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/app/lib/supabaseBrowser'
import {
  DOMINANT_HAND_OPTIONS,
  PROFILE_SKILL_LEVEL_OPTIONS,
  PROFILE_VISIBILITY_OPTIONS,
  canUseOrganizerTools,
  formatProfileValueLabel,
  type ProfileRole,
  type ProfileVisibility,
  type SharedProfile,
} from '@/app/lib/profileCapabilities'

type Club = {
  id: string
  name: string
}

type ProfileRow = SharedProfile & {
  role: ProfileRole | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  region: string | null
  country: string | null
  organization: string | null
  primary_club_id: string | null
  avatar_url: string | null
  display_name: string | null
  bio: string | null
  skill_level: string | null
  favorite_bag_style: string | null
  dominant_hand: string | null
  home_venue: string | null
  profile_visibility: string | null
  is_profile_complete: boolean | null
  completed_at?: string | null
}

export default function ProfileEditorClient({
  userId,
  userEmail,
}: {
  userId: string
  userEmail: string | null
}) {
  const router = useRouter()
  const [supabase] = useState(() => getSupabaseBrowser())

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<ProfileRole>('player')
  const [clubs, setClubs] = useState<Club[]>([])
  const [profileWasComplete, setProfileWasComplete] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    region: '',
    country: 'US',
    organization: '',
    primary_club_id: '',
    display_name: '',
    bio: '',
    favorite_bag_style: '',
    skill_level: '',
    dominant_hand: '',
    home_venue: '',
    profile_visibility: 'public' as ProfileVisibility,
  })

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        if (!alive) return
        setEmail(userEmail)

        const [{ data: profile, error: profileError }, { data: clubRows, error: clubError }] = await Promise.all([
          supabase
            .from('profiles')
            .select(
              'role,first_name,last_name,phone,city,region,country,organization,primary_club_id,avatar_url,display_name,bio,skill_level,favorite_bag_style,dominant_hand,home_venue,profile_visibility,is_profile_complete,completed_at',
            )
            .eq('id', userId)
            .maybeSingle<ProfileRow>(),
          supabase.from('clubs').select('id,name').order('name', { ascending: true }),
        ])

        if (profileError) throw profileError
        if (clubError) throw clubError
        if (!alive) return

        setRole(profile?.role ?? 'player')
        setProfileWasComplete(Boolean(profile?.is_profile_complete))
        setClubs((clubRows ?? []) as Club[])
        setForm({
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          phone: profile?.phone ?? '',
          city: profile?.city ?? '',
          region: profile?.region ?? '',
          country: profile?.country ?? 'US',
          organization: profile?.organization ?? '',
          primary_club_id: profile?.primary_club_id ?? '',
          display_name: profile?.display_name ?? '',
          bio: profile?.bio ?? '',
          favorite_bag_style: profile?.favorite_bag_style ?? '',
          skill_level: profile?.skill_level ?? '',
          dominant_hand: profile?.dominant_hand ?? '',
          home_venue: profile?.home_venue ?? '',
          profile_visibility: (profile?.profile_visibility as ProfileVisibility | null) ?? 'public',
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
  }, [supabase, userEmail, userId])

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      if (!form.first_name || !form.last_name || !form.city || !form.region) {
        throw new Error('First name, last name, city, and region are required.')
      }

      if (canUseOrganizerTools(role) && !form.organization.trim()) {
        throw new Error('Organization is required for organizer and admin profiles.')
      }

      const now = new Date().toISOString()
      const profilePayload = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        city: form.city,
        region: form.region,
        country: form.country || 'US',
        organization: canUseOrganizerTools(role) ? form.organization || null : null,
        primary_club_id: form.primary_club_id || null,
        display_name: form.display_name || null,
        bio: form.bio || null,
        favorite_bag_style: form.favorite_bag_style || null,
        skill_level: form.skill_level || null,
        dominant_hand: form.dominant_hand || null,
        home_venue: form.home_venue || null,
        profile_visibility: form.profile_visibility,
        is_profile_complete: true,
        updated_at: now,
        ...(profileWasComplete ? {} : { completed_at: now }),
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId)

      if (profileError) throw profileError

      setProfileWasComplete(true)
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
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">Portal Profile</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Shared member profile</h1>
            <p className="mt-2 text-sm text-gray-600">
              {email ?? 'Signed-in member'} · role: {formatProfileValueLabel(role)}
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
            <Field label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
          </div>

          {canUseOrganizerTools(role) ? (
            <Field label="Organization" value={form.organization} onChange={(value) => updateField('organization', value)} required />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" value={form.city} onChange={(value) => updateField('city', value)} required />
            <Field label="State / Region" value={form.region} onChange={(value) => updateField('region', value)} required />
            <Field label="Country" value={form.country} onChange={(value) => updateField('country', value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Favorite bag style"
              value={form.favorite_bag_style}
              onChange={(value) => updateField('favorite_bag_style', value)}
            />
            <Field label="Home venue" value={form.home_venue} onChange={(value) => updateField('home_venue', value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Skill level</span>
              <select
                value={form.skill_level}
                onChange={(event) => updateField('skill_level', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="">Choose a level</option>
                {PROFILE_SKILL_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {formatProfileValueLabel(level)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Dominant hand</span>
              <select
                value={form.dominant_hand}
                onChange={(event) => updateField('dominant_hand', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="">Choose a hand</option>
                {DOMINANT_HAND_OPTIONS.map((hand) => (
                  <option key={hand} value={hand}>
                    {formatProfileValueLabel(hand)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Profile visibility</span>
              <select
                value={form.profile_visibility}
                onChange={(event) => updateField('profile_visibility', event.target.value as ProfileVisibility)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                {PROFILE_VISIBILITY_OPTIONS.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {formatProfileValueLabel(visibility)}
                  </option>
                ))}
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
              This uses the shared `primary_club_id` profile field for players, organizers, and admins.
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Bio</span>
            <textarea
              value={form.bio}
              onChange={(event) => updateField('bio', event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              placeholder="Add a short player intro, throwing style, or a few community details."
            />
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
