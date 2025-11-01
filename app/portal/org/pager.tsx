// app/portal/org/page.tsx
import OrganizerClient from './Client';

export default function Page() {
  // No cookies(), no headers(), no server auth helpers here.
  return <OrganizerClient />;
}