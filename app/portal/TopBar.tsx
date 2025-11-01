// app/portal/TopBar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'player' | 'organizer' | 'admin';

export default function TopBar() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;

      setEmail(user?.email ?? null);
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!alive) return;
      if (profile?.role === 'admin' || profile?.role === 'organizer' || profile?.role === 'player') {
        setRole(profile.role);
      } else {
        setRole('player');
      }
    })();

    return () => { alive = false; };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/portal/login');
  }

  const linkClass = (href: string) =>
    `rounded px-3 py-2 text-sm font-medium hover:bg-white/10 ${
      pathname?.startsWith(href) ? 'underline underline-offset-4' : ''
    }`;

  return (
    <nav className="sticky top-0 z-30 bg-[#0A3161] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Left: Brand + back to main site */}
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
            ← Back to NCO
          </Link>
          <div className="flex items-center gap-2">
            <img src="/images/nco-mark.png" alt="NCO" className="h-6 w-6" />
            <span className="font-semibold">Community Portal</span>
          </div>
        </div>

        {/* Center: Route links that actually exist */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/portal/dashboard" className={linkClass('/portal/dashboard')}>Dashboard</Link>
          <Link href="/portal/events" className={linkClass('/portal/events')}>Events</Link>
          {/* Player landing (your “My Registrations” lives here today) */}
          <Link href="/portal/players" className={linkClass('/portal/players')}>My Registrations</Link>

          {/* Organizer console (exists as /portal/org) */}
          {(role === 'organizer' || role === 'admin') && (
            <Link href="/portal/org" className={linkClass('/portal/org')}>Organizer Console</Link>
          )}

          {/* Admin console (exists as /portal/admin) */}
          {role === 'admin' && (
            <>
              <Link href="/portal/demo-bags" className={linkClass('/portal/demo-bags')}>Demo Bags</Link>
              <Link href="/portal/admin" className={linkClass('/portal/admin')}>Admin</Link>
            </>
          )}
        </div>

        {/* Right: user & sign out */}
        <div className="flex items-center gap-2">
          {email && (
            <span className="hidden sm:inline-block text-xs text-white/80">{email}</span>
          )}
          <button
            onClick={signOut}
            className="rounded bg-[#B31942] px-3 py-1.5 text-sm hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}