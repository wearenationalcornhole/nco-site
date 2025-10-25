// app/portal/security/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import SecurityClient from './SecurityClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SecurityPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/portal/login?redirect=/portal/security');

  // Role gate: only organizer/admin get passkey registration UI
  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).maybeSingle();

  const role = me?.role ?? 'player';
  return <SecurityClient role={role} />;
}