// app/shop/page.tsx
import Link from 'next/link'
import Button from '@/components/ui/Button'
import productsData from '@/app/data/products.json'

type Product = {
  id: string
  slug: string
  title: string
  price?: number
  image?: string
  description?: string
}

function formatPrice(n?: number) {
  if (typeof n !== 'number') return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default async function ShopPage() {
  // Normalize JSON → Product[]
  const rawProducts = productsData as unknown as any[]
  const products: Product[] = rawProducts.map((p) => ({
    id: String(p.id ?? crypto.randomUUID()),
    slug:
      p.slug ??
      p.link ??
      (p.name
        ? String(p.name)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
        : ''),
    title: p.title ?? p.name ?? 'Untitled Product',
    price: typeof p.price === 'number' ? p.price : undefined,
    image: p.image ?? undefined,
    description: p.description ?? undefined,
  }))

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative isolate bg-brand text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="uppercase tracking-widest text-white/80 text-xs sm:text-sm">
            National Cornhole Organization
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Shop NCO Official Gear
          </h1>
          <p className="mt-3 text-white/90 max-w-2xl">
            Wear the colors. Support the community. Bring local cornhole together.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <a href="#products">Browse Products</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white/10"
            >
              <a href="/portal/events">Find Events</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <main id="products" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {products.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">No products yet</h2>
            <p className="mt-2 text-gray-600">
              Check back soon for official NCO merchandise.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <article
                key={p.id}
                className="group overflow-hidden rounded-2xl border bg-white hover:shadow-md transition"
              >
                <Link href={`/shop/${p.slug}`}>
                  <div className="aspect-[4/3] w-full bg-usaGray overflow-hidden">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-cover group-hover:scale-[1.02] transition"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full place-content-center text-neutral text-sm">
                        Image coming soon
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/shop/${p.slug}`} className="block">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                      {p.title}
                    </h3>
                  </Link>
                  <div className="mt-2 text-usaBlue font-semibold">
                    {formatPrice(p.price)}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button asChild size="sm">
                      <a href="#" aria-disabled>
                        Add to Cart
                      </a>
                    </Button>
                    <Link
                      href={`/shop/${p.slug}`}
                      className="text-sm text-usaBlue hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Brand Banner */}
      <section className="mt-12 bg-brand text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Official NCO Store</h2>
              <p className="text-white/80 mt-1">
                Quality gear, fast shipping, and every purchase supports our mission.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white/10"
            >
              <Link href="/shop">Shop all products</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}