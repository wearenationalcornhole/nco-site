import Link from 'next/link'
import ActivityFeedList from '@/app/portal/components/ActivityFeedList'
import type { ActivityFeedItem } from '@/app/lib/communityPulseTypes'

export default function CommunityPulseCard({
  items,
  loading = false,
  heading = 'Community Pulse',
  description = 'Recent system-generated activity across NCO.',
}: {
  items: ActivityFeedItem[]
  loading?: boolean
  heading?: string
  description?: string
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-usaBlue">{heading}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Recent activity across the boards.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Link href="/portal/community" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Open community
        </Link>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading community activity…</p>
        ) : (
          <ActivityFeedList
            items={items}
            emptyMessage="No community activity yet. The boards are quiet. Suspicious."
          />
        )}
      </div>
    </section>
  )
}
