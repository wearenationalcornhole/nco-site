// app/auth/callback/page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    (async () => {
      const redirect = params.get('redirect') || '/portal/dashboard';

      // If we already have a session, go straight to destination
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { router.replace(redirect); return; }

      // Flow A: PKCE query param (?code=...)
      const code = params.get('code');
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
          router.replace(redirect);
          return;
        } catch (e) {
          // Fall back to login if something is off
          router.replace(`/portal/login?redirect=${encodeURIComponent(redirect)}`);
          return;
        }
      }

      // Flow B: Hash fragment (#access_token=..., etc.)
      try {
        const { error } = await supabase.auth.getSessionFromUrl();
        if (error) throw error;
        router.replace(redirect);
        return;
      } catch {
        router.replace(`/portal/login?redirect=${encodeURIComponent(redirect)}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="rounded-xl border bg-white p-6">Processing sign-in…</div>
    </main>
  );
}

export default function CallbackPage() {
  // Next requires Suspense around useSearchParams for CSR bailout cases
  return (
    <Suspense fallback={
      <main className="min-h-screen grid place-items-center p-8">
        <div className="rounded-xl border bg-white p-6">Loading…</div>
      </main>
    }>
      <CallbackInner />
    </Suspense>
  );
}