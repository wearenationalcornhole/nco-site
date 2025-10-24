// app/portal/onboarding/OnboardingClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'player' | 'organizer';

type ProfileRow = {
  role: Role | null;
  is_profile_complete: boolean | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  organization: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  avatar_url: string | null;
  primary_club_id: string | null;
};

type Club = { id: string; name: string };

export default function OnboardingClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // User + load state
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Role + profile fields
  const [role, setRole] = useState<Role>('player');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('US');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Clubs (normalized)
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState<string>(''); // '' = none

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Who am I?
        const { data: { user }, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;
        if (!user) { router.replace('/portal/login'); return; }
        setEmail(user.email ?? null);

        // Load clubs for selection (read-only for everyone)
        const { data: clubRows, error: cerr } = await supabase
          .from('clubs')
          .select('id,name')
          .order('name', { ascending: true });
        if (!cerr && clubRows) setClubs(clubRows);

        // Load profile
        const { data: p, error: perr } = await supabase
          .from('profiles')
          .select('role,is_profile_complete,first_name,last_name,phone,organization,city,region,country,avatar_url,primary_club_id')
          .maybeSingle<ProfileRow>();
        if (perr) throw perr;

        // If already complete + role set → bounce to dashboard
        if (p?.role && p.is_profile_complete) {
          router.replace('/portal/dashboard');
          return;
        }

        // Seed form
        if (p?.role) setRole(p.role);
        setFirst(p?.first_name ?? '');
        setLast(p?.last_name ?? '');
        setPhone(p?.phone ?? '');
        setOrg(p?.organization ?? '');
        setCity(p?.city ?? '');
        setRegion(p?.region ?? '');
        setCountry(p?.country ?? 'US');
        setAvatarUrl(p?.avatar_url ?? null);
        setClubId(p?.primary_club_id ?? '');

        setLoading(false);
      } catch (e: any) {
        console.error('onboarding init error', e);
        setErr(e?.message || 'Failed to load onboarding');
        setLoading(false);
      }
    })();
  }, [router, supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/portal/login'); return; }

      // Basic validation
      if (!first || !last || !city || !region) {
        throw new Error('Please fill first name, last name, city, and state/region.');
      }
      if (role === 'organizer' && !org) {
        throw new Error('Please add your organization (for organizers).');
      }

      // Optional avatar upload
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        try {
          const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
          const { error: upErr } = await supabase
            .storage.from('avatars')
            .upload(path, avatarFile, { cacheControl: '3600', upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
          newAvatarUrl = pub.publicUrl;
        } catch (e: any) {
          console.warn('Avatar upload skipped:', e?.message || e);
          setInfo('Profile saved, but we could not upload the avatar right now.');
        }
      }

      // Persist profile (IMPORTANT: include role)
      const { error } = await supabase
        .from('profiles')
        .update({
          role, // 👈 critical to break loops
          first_name: first,
          last_name: last,
          phone: phone || null,
          organization: role === 'organizer' ? org : null,
          city, region, country,
          avatar_url: newAvatarUrl,
          primary_club_id: role === 'player' ? (clubId || null) : null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Hand off to dashboard (it will gate further if still incomplete)
      router.replace('/portal/dashboard');
    } catch (e: any) {
      console.error('onboarding save error', e);
      setErr(e?.message || 'Could not save your profile');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-10">
        Loading onboarding…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <img src="/images/nco-logo.png" alt="NCO" className="h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-[#0A3161]">Complete your profile</h1>
          {email ? <p className="text-gray-600">{email}</p> : null}
        </div>

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
        {info && <p className="mb-4 text-sm text-amber-700">{info}</p>}

        <form onSubmit={submit} className="grid gap-4">
          {/* Role */}
          <fieldset className="mb-2">
            <legend className="text-sm font-medium text-gray-700">I am a…</legend>
            <div className="mt-2 flex gap-6">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="player"
                  checked={role === 'player'}
                  onChange={() => setRole('player')}
                />
                <span>Player</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="organizer"
                  checked={role === 'organizer'}
                  onChange={() => setRole('organizer')}
                />
                <span>Organizer</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              You can switch later. Organizers get event tools; everyone is a player.
            </p>
          </fieldset>

          {/* Avatar */}
          <div className="grid sm:grid-cols-[112px,1fr] gap-4 items-center">
            <div className="justify-self-center">
              <img
                src={avatarFile ? URL.createObjectURL(avatarFile) : (avatarUrl || '/images/nco-mark.webp')}
                alt="Avatar"
                className="h-24 w-24 object-cover rounded-full border border-gray-300"
              />
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Profile image (optional)</span>
              <input type="file" accept="image/*" onChange={(e)=>setAvatarFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
              <span className="text-xs text-gray-500">PNG/JPG/WebP. Public for in-app display.</span>
            </label>
          </div>

          {/* Name */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" value={first} onChange={setFirst} required />
            <Field label="Last name"  value={last}  onChange={setLast}  required />
          </div>

          {/* Organizer-only */}
          {role === 'organizer' && (
            <Field label="Organization" value={org} onChange={setOrg} required />
          )}

          {/* Location */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City" value={city} onChange={setCity} required />
            <Field label="State/Region" value={region} onChange={setRegion} required />
            <Field label="Country" value={country} onChange={setCountry} />
          </div>

          {/* Contact */}
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="(optional)" />

          {/* Player: Club */}
          {role === 'player' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Club (optional)</span>
              <select
                value={clubId}
                onChange={(e)=>setClubId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">— No club / Independent —</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}

          <button
            disabled={saving}
            className="mt-2 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#0A3161' }}
          >
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, required=false, placeholder='' }:{
  label: string; value: string; onChange: (v:string)=>void; required?: boolean; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}{required && ' *'}</span>
      <input
        type="text"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
      />
    </label>
  );
}