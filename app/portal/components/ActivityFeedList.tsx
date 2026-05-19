import type { ActivityFeedItem } from '@/app/lib/communityPulseTypes'

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Just now'

  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(deltaSeconds)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absSeconds < 60) return formatter.format(deltaSeconds, 'second')
  if (absSeconds < 3600) return formatter.format(Math.round(deltaSeconds / 60), 'minute')
  if (absSeconds < 86400) return formatter.format(Math.round(deltaSeconds / 3600), 'hour')
  return formatter.format(Math.round(deltaSeconds / 86400), 'day')
}

function initialsFromName(name: string | null | undefined) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return 'N'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export default function ActivityFeedList({
  items,
  emptyMessage,
}: {
  items: ActivityFeedItem[]
  emptyMessage: string
}) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">{emptyMessage}</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            {item.actor?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.actor.avatarUrl} alt="" className="mt-0.5 h-10 w-10 rounded-full border border-slate-200 object-cover" />
            ) : (
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-usaBlue/10 text-sm font-semibold text-usaBlue">
                {initialsFromName(item.actor?.name)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  {item.actor?.name ? <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.actor.name}</p> : null}
                </div>
                <p className="text-xs text-slate-500">{formatRelativeTime(item.createdAt)}</p>
              </div>

              {item.message ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
