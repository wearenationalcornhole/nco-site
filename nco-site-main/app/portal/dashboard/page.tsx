// app/portal/dashboard/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import DashboardClient from './DashboardClient';
export default function Page() { return <DashboardClient />; }