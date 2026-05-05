'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useShopCart } from './ShopCartProvider'

export default function OrderSuccessClient({ sessionId }: { sessionId?: string }) {
  const { clearCart } = useShopCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
        Checkout Complete
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
        Thanks for your order.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
        Stripe reports the checkout session as complete and the cart on this device has been cleared.
        You can return to the store anytime to keep building your NCO setup.
      </p>
      {sessionId && (
        <p className="mt-4 text-sm text-slate-500">
          Checkout session: <code className="rounded bg-slate-100 px-2 py-1">{sessionId}</code>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to Shop
        </Link>
        <Link
          href="/portal/orders"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          View Orders
        </Link>
        <Link
          href="/portal"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          Join Community
        </Link>
      </div>
    </div>
  )
}
