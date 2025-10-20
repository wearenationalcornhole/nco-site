// app/shop/[slug]/page.tsx
import Link from 'next/link'
import Button from '@/components/ui/Button'
import productsData from '@/app/data/products.json'

// Explicit local interface (avoids conflict with global PageProps)
interface ProductPageProps {
  params: {
    slug: string
  }
}

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

export default function ProductPage({ params }: ProductPageProps) {
  const { slug } = params
  const products = (productsData as Product[]) ?? []
  const product = products.find((p) => p.slug === slug)

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-semibold text-gray-900">Product not found</h1>
        <p className="mt-2 text-gray-600">
          We couldn’t find that item. It may have been moved or is unavailable.
        </p>
        <div className="mt-6">
          <Link href="/shop" className="underline text-usaBlue hover:opacity-90">
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
          <nav className="text-sm">
            <ol className="flex items-center gap-1 text-gray-500">
              <li>
                <Link href="/shop" className="hover:text-usaBlue">Shop</Link>
              </li>
              <li aria-hidden="true" className="px-1">/</li>
              <li className="text-gray-900">{product.title}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Product details */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-usaGray">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-content-center text-neutral text-sm">
                  Image coming soon
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
            <div className="mt-3 text-2xl font-semibold text-usaBlue">
              {formatPrice(product.price)}
            </div>

            {product.description && (
              <p className="mt-4 text-gray-700 leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href="#" aria-disabled>
                  Add to Cart
                </a>
              </Button>

              <Link
                href="/shop"
                className="text-sm text-usaBlue hover:underline"
              >
                Continue shopping
              </Link>
            </div>

            <div className="mt-10 rounded-xl border bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-700">Details</h2>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Official National Cornhole Organization merchandise</li>
                <li>Fast shipping within the U.S.</li>
                <li>Secure checkout</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Brand highlight */}
        <section className="mt-14 rounded-2xl bg-brand text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">NCO Official Shop</h3>
              <p className="text-white/80 text-sm mt-1">
                Wear the colors. Support the community. Bring local cornhole together.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white/10"
            >
              <Link href="/shop">Browse all products</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}