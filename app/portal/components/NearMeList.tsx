import Link from 'next/link'

export type NearMeListItem = {
  id: string
  title: string
  subtitle?: string | null
  href?: string | null
  badge?: string | null
}

export default function NearMeList({
  title,
  items,
  emptyMessage,
}: {
  title: string
  items: NearMeListItem[]
  emptyMessage: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-usaBlue">{title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const content = (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  {item.subtitle ? <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p> : null}
                </div>
                {item.badge ? <span className="rounded-full bg-usaBlue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-usaBlue">{item.badge}</span> : null}
              </>
            )

            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-usaBlue/30 hover:bg-white"
              >
                {content}
              </Link>
            ) : (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
