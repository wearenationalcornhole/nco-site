'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import Badge from '@/components/ui/Badge'
import AddToCartButton from './AddToCartButton'
import {
  formatPrice,
  getInventoryLabel,
  getInventoryTone,
  type Product,
} from '@/app/lib/store/catalog'

export default function ShopCatalogClient({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<string>('All')

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  )

  const featured = products.filter((product) => product.featured)
  const visibleProducts = products.filter(
    (product) => category === 'All' || product.category === category,
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                NCO Store
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                NCO gear built for league nights, tournament weekends, and club identity.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Browse the current NCO product lineup, compare speed and control profiles, and
                move directly into Stripe Checkout from a persistent cart.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      category === item
                        ? 'bg-[#0A3161] text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#0A3161] p-6 text-white shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F4D35E]">
                Featured
              </p>
              <div className="mt-5 space-y-5">
                {featured.map((product) => (
                  <div key={product.slug} className="rounded-3xl bg-white/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-white/70">{product.category}</p>
                        <h2 className="mt-1 text-lg font-semibold">{product.title}</h2>
                      </div>
                      <Badge color={getInventoryTone(product.inventoryStatus)}>
                        {getInventoryLabel(product.inventoryStatus)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-lg font-bold">{formatPrice(product.price)}</p>
                      <Link
                        href={`/shop/${product.slug}`}
                        className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <article
              key={product.slug}
              className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Link href={`/shop/${product.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image
                    src={product.images[0]}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain p-6"
                  />
                  {product.featured && (
                    <div className="absolute left-4 top-4 rounded-full bg-[#B31942] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      Featured
                    </div>
                  )}
                </div>
              </Link>

              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {product.category}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">{product.title}</h2>
                  </div>
                  <Badge color={getInventoryTone(product.inventoryStatus)}>
                    {getInventoryLabel(product.inventoryStatus)}
                  </Badge>
                </div>

                <p className="text-sm leading-6 text-slate-600">{product.shortDescription}</p>

                <div className="grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
                  <Metric label="Speed" value={product.speedRating ? `${product.speedRating}/10` : 'N/A'} />
                  <Metric
                    label="Control"
                    value={product.controlRating ? `${product.controlRating}/10` : 'N/A'}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Price</p>
                    <p className="text-2xl font-black text-slate-900">{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/shop/${product.slug}`}
                      className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      Details
                    </Link>
                    <AddToCartButton slug={product.slug} inventoryStatus={product.inventoryStatus} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}
