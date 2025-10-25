// app/auth/callback/page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function parseHashFragment(hash: string) {
  // hash comes like: "#access_token=...&refresh_token=...&token_type=bearer&expires_in=3600&type=magiclink"
  const out = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const access_token = out.get('access_token') || undefined;
  const refresh_token = out.get('refresh_token') || undefined;
  return { access_token, refresh_token };
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    (async () => {
      const redirect = params.get('redirect') || '/portal/dashboard';

      // If we already have a session, go straight through
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
          // fall back to login
          router.replace(`/portal/login?redirect=${encodeURIComponent(redirect)}`);
          return;
        }
      }

      // Flow B: Hash fragment (#access_token=...&refresh_token=...)
      if (typeof window !== 'undefined' && window.location.hash) {
        const { access_token, refresh_token } = parseHashFragment(window.location.hash);
        if (access_token && refresh_token) {
          try {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            // Clean the hash from URL (optional nicety)
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            router.replace(redirect);
            return;
          } catch {
            router.replace(`/portal/login?redirect=${encodeURIComponent(redirect)}`);
            return;
          }
        }
      }

      // Nothing usable — send to login
      router.replace(`/portal/login?redirect=${encodeURIComponent(redirect)}`);
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
  // Suspense wrapper satisfies Next when using useSearchParams in a client page
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