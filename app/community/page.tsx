import Link from 'next/link'
import Button from '@/components/ui/Button'
import { getPublicClubs } from '@/app/lib/community'

export const metadata = {
  title: 'Community | National Cornhole Organization',
  description: 'Explore the NCO community experience for players, clubs, and organizers.',
}

export default async function CommunityPage() {
  const clubs = await getPublicClubs()
  const featuredClubs = clubs.slice(0, 3)

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-[#0A3161] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F4D35E]">
            Community MVP
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            Build a stronger local cornhole network around clubs, players, and organizers.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/80 sm:text-lg">
            The community layer gives players a clearer front door, helps clubs stay visible, and
            keeps member tools inside the existing portal auth flow.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/clubs">Explore Clubs</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/players">Player Directory</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/portal">Join the Portal</Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <StatCard value={String(clubs.length)} label="Clubs discoverable today" />
            <StatCard value="Auth-gated" label="Player directory visibility model" />
            <StatCard value="Portal-ready" label="Profile editing for members" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <FeatureCard
            eyebrow="Players"
            title="Create a recognizable profile and stay connected to your local scene."
            copy="Members can manage display name, favorite bag, skill level, region, and directory visibility without changing the existing portal auth flow."
            href="/portal/profile"
            cta="Open Profile"
          />
          <FeatureCard
            eyebrow="Clubs"
            title="Give local groups a stable public destination."
            copy="Clubs now have a dedicated public listing page with location, website, and future join tooling called out explicitly."
            href="/clubs"
            cta="View Clubs"
          />
          <FeatureCard
            eyebrow="Directory"
            title="Keep player discovery gated until public profile controls are backed by schema."
            copy="The player directory is intentionally limited to signed-in members during the MVP so visibility preferences are respected."
            href="/players"
            cta="See Directory"
          />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                Featured Clubs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Local groups with a clearer public footprint.
              </h2>
            </div>
            <Link href="/clubs" className="text-sm font-semibold text-[#0A3161] hover:underline">
              Browse all clubs
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredClubs.map((club) => (
              <article key={club.id} className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <InitialBadge name={club.name} />
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {club.source === 'supabase' ? 'Live club data' : 'Seed club data'}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-slate-900">{club.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {club.city && club.state ? `${club.city}, ${club.state}` : 'Location coming soon'}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Club join and follow intent is staged for the next schema pass so this MVP can
                  stay compatible with the current auth and database shape.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
      <p className="text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-white/75">{label}</p>
    </div>
  )
}

function FeatureCard({
  eyebrow,
  title,
  copy,
  href,
  cta,
}: {
  eyebrow: string
  title: string
  copy: string
  href: string
  cta: string
}) {
  return (
    <article className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-slate-600">{copy}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
      >
        {cta}
      </Link>
    </article>
  )
}

function InitialBadge({ name }: { name: string }) {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A3161] text-lg font-black text-white">
      {name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)}
    </div>
  )
}
