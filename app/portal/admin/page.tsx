export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal/login?redirect=%2Fportal%2Fadmin');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (me?.role !== 'admin') redirect('/portal/dashboard');

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A3161] mb-6">Admin Console</h1>
      <AdminClient />
    </main>
  );
}