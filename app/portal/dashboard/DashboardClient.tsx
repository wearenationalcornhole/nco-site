'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/app/lib/supabaseBrowser';
import {
  canUseAdminTools,
  canUseOrganizerTools,
  formatProfileValueLabel,
  getProfileDisplayName,
  isProfileReadyForPortal,
  type ProfileRole,
} from '@/app/lib/profileCapabilities';

type DashboardProfile = {
  role: ProfileRole | null;
  is_profile_complete: boolean | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email?: string | null;
  organization: string | null;
  city: string | null;
  region: string | null;
  avatar_url: string | null;
  primary_club_id: string | null;
};

export default function DashboardClient() {
  const router = useRouter();
  const [supabase] = useState(() => getSupabaseBrowser());

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ProfileRole>('player');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('NCO Player');
  const [clubName, setClubName] = useState<string | null>(null);
  const [managedClubCount, setManagedClubCount] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/portal/login?error=no_user_in_dashboard_client');
          return;
        }
        if (!alive) return;
        setEmail(user.email ?? null);

        const { data: p, error: perr } = await supabase
          .from('profiles')
          .select(
            'role,is_profile_complete,first_name,last_name,display_name,organization,city,region,avatar_url,primary_club_id'
          )
          .eq('id', user.id)
          .maybeSingle<DashboardProfile>();

        if (perr) throw perr;

        if (!p) {
          router.replace('/portal/onboarding?debug=missing_profile');
          return;
        }

        if (!isProfileReadyForPortal(p)) {
          router.replace('/portal/onboarding?debug=incomplete_profile');
          return;
        }

        if (!p.is_profile_complete) {
          const { error: completeErr } = await supabase
            .from('profiles')
            .update({
              is_profile_complete: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (completeErr) throw completeErr;
        }

        const resolvedRole = (p.role as ProfileRole | null) ?? 'player';
        if (!alive) return;
        setRole(resolvedRole);
        setDisplayName(getProfileDisplayName({ ...p, email: user.email ?? null }));
        setAvatar(p.avatar_url ?? null);

        if (p.primary_club_id) {
          const { data: club, error: cerr } = await supabase
            .from('clubs')
            .select('name')
            .eq('id', p.primary_club_id)
            .maybeSingle();
          if (!cerr && alive) setClubName(club?.name ?? null);
        }

        try {
          const managedRes = await fetch('/portal/api/clubs/managed', { cache: 'no-store' });
          const managedJson = managedRes.ok ? await managedRes.json() : { items: [] };
          if (alive) {
            const count = Array.isArray(managedJson.items) ? managedJson.items.length : 0;
            setManagedClubCount(canUseAdminTools(resolvedRole) ? Math.max(count, 1) : count);
          }
        } catch {
          if (alive) setManagedClubCount(canUseAdminTools(resolvedRole) ? 1 : 0);
        }

        if (alive) setLoading(false);
      } catch (e: any) {
        console.error('dashboard error', e);
        if (alive) {
          setErr(e?.message || 'Failed to load dashboard');
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/portal/login');
  };

  if (loading) return <main className="min-h-screen grid place-items-center">Loading…</main>;

  if (err) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md bg-white rounded shadow p-4">
          <p className="text-red-600 font-semibold">Dashboard error</p>
          <p className="text-sm mt-2">{err}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
      <header className="text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/nco-mark.png" alt="NCO" className="mx-auto mb-4 h-16" />
        <h1 className="text-3xl font-semibold text-[#0A3161]">National Cornhole Portal</h1>
        <p className="mt-2 text-gray-600">
          Welcome{displayName ? `, ${displayName}` : email ? `, ${email}` : ''}!{' '}
          <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-[#0A3161]/10 px-3 py-0.5 text-sm text-[#0A3161]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} alt="" className="h-5 w-5 rounded-full border" /> : null}
            {formatProfileValueLabel(role)}
          </span>
        </p>
        {clubName && (
          <p className="text-sm text-gray-600 mt-1">
            Club: <strong>{clubName}</strong>
          </p>
        )}

        <div className="mt-4">
          <Link href="/portal/profile" className="text-sm text-[#0A3161] underline underline-offset-2">
            Edit profile
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        <Card
          title="Player Hub"
          desc="Open your shared player dashboard, identity fields, and registration history."
          cta="Open player hub"
          href="/portal/players"
          color="#0A3161"
        />
        <Card
          title="Find & Join Events"
          desc="Browse upcoming tournaments."
          cta="Browse events"
          href="/portal/events"
          color="#0A3161"
        />
        <Card
          title="My Registrations"
          desc="Your entries, statuses, and event history."
          cta="View registrations"
          href="/portal/my-registrations"
          color="#0A3161"
        />
        <Card
          title="Shared Profile"
          desc="Manage your personal NCO identity, visibility, club affiliation, and player details."
          cta="Edit profile"
          href="/portal/profile"
          color="#B31942"
        />
        <Card
          title="Orders & Payments"
          desc="Review store checkouts and paid event history."
          cta="Open billing"
          href="/portal/orders"
          color="#0A3161"
        />
        {(managedClubCount > 0 || canUseAdminTools(role)) && (
          <Card
            title="Club Management"
            desc="Open club-scoped tools and membership APIs without treating club access as organizer access."
            cta="Open club tools"
            href="/portal/clubs"
            color="#B31942"
          />
        )}

        {canUseOrganizerTools(role) && (
          <>
            <Card
              title="Organizer Tools"
              desc="Manage event organizer workflows without splitting your personal profile or club permissions."
              cta="Open organizer tools"
              href="/portal/org"
              color="#0A3161"
            />
            <Card
              title="Demo Bags"
              desc="View and share event mockups."
              cta="Open gallery"
              href="/portal/demo-bags"
              color="#B31942"
            />
            <Card
              title="Security & Passkeys"
              desc="Register passkeys and manage device trust."
              cta="Open security"
              href="/portal/security"
              color="#0A3161"
            />
          </>
        )}

        {canUseAdminTools(role) && (
          <Card
            title="Admin Console"
            desc="Manage organizers, demo access, and admin workflows."
            cta="Open admin"
            href="/portal/admin"
            color="#0A3161"
          />
        )}
      </section>

      <div className="mt-10 text-center">
        <button
          onClick={signOut}
          className="text-sm text-gray-600 hover:text-[#B31942] underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Card({
  title,
  desc,
  cta,
  href,
  color,
}: {
  title: string;
  desc: string;
  cta: string;
  href: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className="group block rounded-2xl bg-white p-6 shadow ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <h2 className="text-xl font-semibold mb-1" style={{ color }}>
        {title}
      </h2>
      <p className="text-gray-600 mb-4">{desc}</p>
      <span
        className="inline-flex items-center font-medium text-white px-4 py-2 rounded"
        style={{ backgroundColor: color }}
      >
        {cta}
        <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 11-1.414-1.414L14.586 12H5a1 1 0 110-2h9.586l-2.293-2.293a1 1 0 010-1.414z" />
        </svg>
      </span>
    </a>
  );
}
