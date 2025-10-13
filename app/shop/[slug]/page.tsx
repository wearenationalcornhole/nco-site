import Header from '@/components/Header'
import Footer from '@/components/Footer'
import products from '@/app/data/products.json'
import type { Metadata } from 'next'

type Product = {
  id: string
  name: string
  category: string
  price: number
  image: string
  link: string
}

function getSlugFromLink(link: string) {
  return link.split('/').filter(Boolean).pop() || ''
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const list = products as Product[]
  const product = list.find(p => getSlugFromLink(p.link) === slug)
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'This product could not be located.',
      alternates: { canonical: `/shop/${slug}` },
    }
  }
  return {
    title: product.name,
    description: `${product.category} — $${product.price.toFixed(2)}`,
    alternates: { canonical: product.link },
    openGraph: { images: [product.image] },
    twitter: { images: [product.image] },
  }
}

export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const product = (products as Product[]).find(p => getSlugFromLink(p.link) === slug)

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h1 className="text-3xl font-bold">Product Not Found</h1>
            <p className="mt-2 text-gray-600">Please check back soon — this item isn’t available yet.</p>
            <a href="/shop" className="mt-6 inline-block rounded-full bg-usaRed px-6 py-2 font-semibold text-white hover:bg-[#8F1732]">
              Back to Shop
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-white">
        <section className="relative h-72 sm:h-96">
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full flex flex-col justify-end px-6 pb-8 sm:px-10 max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-white">{product.name}</h1>
            <p className="text-white/90">{product.category}</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-neutral-200">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div>
              <h2 className="text-3xl font-semibold">{product.name}</h2>
              <p className="mt-2 text-gray-600">{product.category}</p>
              <p className="mt-4 text-2xl font-bold">${product.price.toFixed(2)}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  disabled
                  className="rounded-full bg-gray-400 px-6 py-3 text-white font-semibold cursor-not-allowed"
                  aria-disabled="true"
                  title="Store coming soon"
                >
                  Coming Soon — Official NCO Store Launching Soon
                </button>
                <a
                  href="/shop"
                  className="rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-800 hover:bg-gray-100"
                >
                  Back to Shop
                </a>
              </div>

              <p className="mt-6 text-gray-700 leading-relaxed">
                Premium cornhole gear built for serious players. Designed for performance, durability, and style —
                each NCO product meets regulation specs and is made with tournament-grade materials.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}