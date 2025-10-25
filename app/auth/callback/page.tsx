'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallbackPage() {
  const supabase = createClientComponentClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Figure out where to go after we set the session
        const loc = new URL(window.location.href);
        const redirect = loc.searchParams.get('redirect') || '/portal';

        // Case A: code=... in query (OAuth/PKCE style)
        const code = loc.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.location.replace(redirect);
          return;
        }

        // Case B: tokens in the URL hash (magic link style)
        // Some Supabase projects deliver magic links with #access_token=...
        // @ts-ignore — webauthn / getSessionFromUrl may not exist on all versions
        if (typeof supabase.auth.getSessionFromUrl === 'function') {
          // Store the session from the URL hash (and remove the hash)
          // @ts-ignore
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) throw error;
          window.location.replace(redirect);
          return;
        }

        // Fallback: try to detect an already-signed session (rare but harmless)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.replace(redirect);
          return;
        }

        throw new Error('No auth code or hash tokens found in callback URL.');
      } catch (e: any) {
        setError(e?.message || 'Authentication failed.');
      }
    };
    run();
  }, [supabase]);

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md text-center">
        <p className="text-lg font-semibold text-[#0A3161]">Signing you in…</p>
        <p className="text-sm text-gray-600 mt-2">
          If this takes more than a couple seconds, try the link again.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}