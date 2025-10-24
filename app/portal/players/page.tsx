// app/portal/players/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Client from './Client';

export default async function Page() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal/login?redirect=%2Fportal%2Fplayers');

  const { data: p } = await supabase
    .from('profiles')
    .select('role, is_profile_complete')
    .eq('id', user.id)
    .maybeSingle();

  if (!p?.role) redirect('/portal/onboarding');
  if (!p?.is_profile_complete) redirect('/portal/onboarding/profile');

  return <Client />;
}