// app/portal/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';

export default async function PortalIndex() {
  // ⬇️ await here to get the Supabase client
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fdashboard');
  }

  redirect('/portal/dashboard');
}