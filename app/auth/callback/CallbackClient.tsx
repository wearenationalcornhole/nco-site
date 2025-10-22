'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // read redirect param from the actual browser URL
      const url = new URL(window.location.href);
      const to = url.searchParams.get('redirect') || '/portal';

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        console.error('exchange error', error);
        router.replace(`/portal/login?e=${encodeURIComponent(error.message)}`);
        return;
      }

      router.replace(to);
    };
    run();
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center">
      <p>Signing you in…</p>
    </main>
  );
}