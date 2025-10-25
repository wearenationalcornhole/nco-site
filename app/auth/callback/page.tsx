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

      // If we already have a session, just go
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { router.replace(redirect); return; }

      // 1) Try PKCE query param (?code=...)
      const code = params.get('code');
      if (code) {
        // Let the server route handle cookie setting (more robust in Next SSR)
        // This page might be hit directly; fallback: call exchange on client
        try {
          // client-side exchange; sets cookies via helpers
          await supabase.auth.exchangeCodeForSession(code);
          router.replace(redirect);
          return;
        } catch {
          // If client exchange fails for some reason, still redirect to server route
          router.replace(`/auth/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirect)}`);
          return;
        }
      }

      // 2) Handle hash fragment flow (#access_token=..., etc.)
      try {
        const { error } = await supabase.auth.getSessionFromUrl();
        if (error) throw error;
        router.replace(redirect);
        return;
      } catch {
        // Last resort: go to login
        router.replace(`/portal/login?redirect=${encodeURIComponent(redirect)}`);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="rounded-xl border bg-white p-6">
        Processing sign-in…
      </div>
    </main>
  );
}

export default function CallbackPage() {
  // Satisfy Next’s requirement for useSearchParams with Suspense
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