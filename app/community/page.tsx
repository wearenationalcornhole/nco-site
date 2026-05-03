import Link from 'next/link'
import { listCommunityClubs } from '@/app/lib/communityData'

export default async function CommunityPage() {
  const clubs = await listCommunityClubs()
  const affiliatedPlayers = clubs.reduce((sum, club) => sum + club.memberCount, 0)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef3f8_100%)]">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">Community</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Find clubs, meet players, and keep your local scene connected.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            The NCO community layer ties together club discovery, player profiles, and event participation without forcing
            everyone through the organizer tools first.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard label="Club directory" value={String(clubs.length)} detail="Public clubs currently listed" />
          <StatCard label="Affiliated players" value={String(affiliatedPlayers)} detail="Profiles tied to a club today" />
          <StatCard label="Member tools" value="Live" detail="Profile editing and registrations in the portal" />
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <ActionCard
            href="/clubs"
            eyebrow="Clubs"
            title="Browse club cards"
            body="See active club listings, home regions, and current affiliation counts."
          />
          <ActionCard
            href="/players"
            eyebrow="Players"
            title="Open the player directory"
            body="The directory stays member-gated so community data is visible to signed-in players, not anonymous traffic."
          />
          <ActionCard
            href="/portal/profile"
            eyebrow="Profile"
            title="Set up your profile"
            body="Choose how your name appears, pick a favorite bag, set visibility, and attach yourself to a club."
          />
        </div>
      </section>
    </main>
  )
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">{label}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm text-gray-600">{detail}</p>
    </div>
  )
}

function ActionCard({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <Link href={href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <p className="text-sm font-semibold uppercase tracking-wide text-usaBlue">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-gray-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600">{body}</p>
      <span className="mt-6 inline-flex rounded-full bg-usaBlue px-4 py-2 text-sm font-medium text-white">
        Explore
      </span>
    </Link>
  )
}
