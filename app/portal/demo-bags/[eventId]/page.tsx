// app/portal/dashboard/DashboardClient.tsx
type Role = 'organizer' | 'player' | 'admin';

<section className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
  {(role === 'organizer' || role === 'admin') ? (
    <>
      <Card title="Demo Bags" desc="View and share event bag mockups." cta="Open gallery" href="/portal/demo-bags" color="#B31942" />
      <Card title="My Events" desc="Create & manage tournaments." cta="Go to events" href="/portal/events" color="#0A3161" />
      <Card title="My Registrations" desc="Divisions, statuses & bags." cta="View registrations" href="/portal/players" color="#0A3161" />
    </>
  ) : (
    <>
      <Card title="Find & Join Events" desc="Browse upcoming tournaments." cta="Browse events" href="/portal/events" color="#0A3161" />
      <Card title="My Registrations" desc="Divisions, statuses & bags." cta="View registrations" href="/portal/players" color="#0A3161" />
    </>
  )}
</section>