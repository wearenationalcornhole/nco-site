// app/portal/org/AuthGate.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Props = { children: React.ReactNode };

export default function AuthGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Fast read — no cookie writes on client
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace(`/portal/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // Role check
        const { data: me, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !me || (me.role !== 'organizer' && me.role !== 'admin')) {
          router.replace('/portal/dashboard');
          return;
        }

        if (!alive) return;
        setAllowed(true);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => { alive = false; };
  }, [supabase, router, pathname]);

  // Tiny skeleton; avoids flicker
  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-white p-6 text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!allowed) return null; // we redirected already

  return <>{children}</>;
}