import Link from 'next/link'

export const metadata = {
  title: 'Checkout Canceled | National Cornhole Organization',
  description: 'Stripe checkout cancellation page for the NCO store.',
}

export default function ShopCancelPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
            Checkout Canceled
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
            Your cart is still waiting.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Stripe checkout was canceled before payment completed. Your local cart remains intact,
            so you can return to the store and try again whenever you are ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Return to Shop
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Review Cart
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
