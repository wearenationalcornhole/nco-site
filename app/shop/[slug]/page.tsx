// app/shop/[slug]/page.tsx
import Link from 'next/link'
import products from '@/app/data/products.json'

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = (products as any[]).find((p) => p.slug === params.slug)
  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-white">Product not found</h1>
        <div className="mt-4">
          <Link href="/shop" className="rounded border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10">
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white rounded-xl overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-auto object-cover"
            loading="eager"
          />
        </div>
        <div className="lg:col-span-6">
          <h1 className="text-3xl font-bold text-white">{product.name}</h1>
          <p className="text-white/80 mt-2">${product.price}</p>
          <p className="text-white/80 mt-4">{product.description}</p>

          <div className="mt-6 flex gap-3">
            <button className="rounded-md bg-usaBlue text-white px-4 py-2 text-sm hover:opacity-90">
              Add to Cart
            </button>
            <Link
              href="/shop"
              className="rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}