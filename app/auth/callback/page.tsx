// server component (default)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import CallbackClient from './CallbackClient';

export default function Page() {
  return <CallbackClient />;
}