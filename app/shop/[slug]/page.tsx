import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import AddToCartButton from '../AddToCartButton'
import {
  formatPrice,
  getInventoryLabel,
  getInventoryTone,
  getProductBySlug,
  getRelatedProducts,
} from '@/app/lib/store/catalog'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = getRelatedProducts(product.slug, 3)

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <Link href="/shop" className="font-medium text-[#0A3161] hover:underline">
            Shop
          </Link>
          <span>/</span>
          <span>{product.title}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-contain p-8"
              />
            </div>

            {product.images.length > 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.images.slice(1).map((image, index) => (
                  <div
                    key={`${product.slug}-${index}`}
                    className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200"
                  >
                    <Image
                      src={image}
                      alt={`${product.title} view ${index + 2}`}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-contain p-6"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <Badge color={getInventoryTone(product.inventoryStatus)}>
                {getInventoryLabel(product.inventoryStatus)}
              </Badge>
              {product.featured && <Badge color="blue">Featured</Badge>}
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {product.category}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
              {product.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{product.description}</p>

            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Price</p>
                <p className="text-4xl font-black text-slate-900">{formatPrice(product.price)}</p>
              </div>
              <AddToCartButton
                slug={product.slug}
                inventoryStatus={product.inventoryStatus}
                className="min-w-[170px]"
              />
            </div>

            <div className="mt-8 grid gap-4 rounded-[1.5rem] bg-slate-50 p-5 sm:grid-cols-2">
              <RatingCard label="Speed" value={product.speedRating} />
              <RatingCard label="Control" value={product.controlRating} />
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">Bag Specs</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Spec label="Series" value={product.bagSpecs.series} />
                <Spec label="Fill" value={product.bagSpecs.fill} />
                <Spec label="Material" value={product.bagSpecs.material} />
                <Spec label="Weight" value={product.bagSpecs.weight} />
                <Spec label="Size" value={product.bagSpecs.size} />
                <Spec label="Break-In" value={product.bagSpecs.breakIn} />
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                Browse More Products
              </Link>
              <Link
                href="/portal"
                className="rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Join Community
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
                Related Products
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Continue building your setup.
              </h2>
            </div>
            <Link href="/shop" className="text-sm font-semibold text-[#0A3161] hover:underline">
              View All
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {relatedProducts.map((related) => (
              <article
                key={related.slug}
                className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200"
              >
                <Link href={`/shop/${related.slug}`} className="block">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image
                      src={related.images[0]}
                      alt={related.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain p-6"
                    />
                  </div>
                </Link>

                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {related.category}
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">{related.title}</h3>
                    </div>
                    <Badge color={getInventoryTone(related.inventoryStatus)}>
                      {getInventoryLabel(related.inventoryStatus)}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{related.shortDescription}</p>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-2xl font-black text-slate-900">
                      {formatPrice(related.price)}
                    </p>
                    <Link
                      href={`/shop/${related.slug}`}
                      className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function RatingCard({ label, value }: { label: string; value: number }) {
  const normalized = Math.max(0, Math.min(10, value))

  return (
    <div className="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value ? `${value}/10` : 'N/A'}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#B31942]"
          style={{ width: `${normalized * 10}%` }}
        />
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  )
}
