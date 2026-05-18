'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatPrice, getInventoryLabel } from '@/app/lib/store/catalog'
import { useShopCart } from './ShopCartProvider'

export default function CartDrawer() {
  const {
    items,
    entries,
    itemCount,
    subtotal,
    isOpen,
    openCart,
    closeCart,
    removeItem,
    setQuantity,
  } = useShopCart()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCheckout = useMemo(() => entries.length > 0 && !busy, [busy, entries.length])

  async function checkout() {
    try {
      setBusy(true)
      setError(null)

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
        }),
      })

      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(json?.error ?? 'Unable to start checkout')
      }
      if (!json?.url) throw new Error('Stripe Checkout URL was not returned')

      window.location.assign(json.url)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to start checkout')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:opacity-95"
      >
        <span>Cart</span>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-[#0A3161]">
          {itemCount}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close cart"
            onClick={closeCart}
            className="absolute inset-0 bg-slate-950/55"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                  NCO Store
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Your Cart</h2>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {entries.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">Cart is empty</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Add a bag or tee from the shop to start checkout.
                  </p>
                  <Link
                    href="/shop"
                    onClick={closeCart}
                    className="mt-5 inline-flex rounded-full bg-[#B31942] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {entries.map((entry) => (
                    <li key={entry.key} className="rounded-3xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            {entry.category}
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-900">
                            {entry.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {entry.inventoryStatus === 'custom_order'
                              ? 'Custom bag build'
                              : getInventoryLabel(entry.inventoryStatus)}
                          </p>
                          {entry.kind === 'custom_bag' && entry.designId ? (
                            <p className="mt-1 text-xs text-slate-500">Design {entry.designId}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(entry.key)}
                          className="text-sm font-medium text-[#B31942] hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-full border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setQuantity(entry.key, entry.quantity - 1)}
                            className="px-3 py-2 text-slate-700 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="px-3 py-2 text-sm font-semibold text-slate-900">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(entry.key, entry.quantity + 1)}
                            className="px-3 py-2 text-slate-700 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-slate-500">{formatPrice(entry.unitPrice)} each</p>
                          <p className="text-base font-semibold text-slate-900">
                            {formatPrice(entry.lineTotal)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="text-lg font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Stripe handles secure checkout and promotion codes. You can review your cart here before
                continuing to payment.
              </p>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                disabled={!canCheckout}
                onClick={checkout}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? 'Redirecting to Checkout…' : 'Checkout with Stripe'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
