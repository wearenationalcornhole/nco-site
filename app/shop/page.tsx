// app/shop/page.tsx
import Link from 'next/link'
import products from '@/app/data/products.json'

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">Shop</h1>
        <p className="text-white/80 mt-1">NCO gear and accessories.</p>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(products as any[]).map((p) => (
          <li key={p.slug} className="rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur">
            <div className="aspect-[16/10] bg-white">
              <img
                src={p.image}
                alt={p.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-white">{p.name}</h2>
              <p className="text-white/80 text-sm mt-1">${p.price}</p>
              <div className="mt-3">
                <Link
                  href={`/shop/${p.slug}`}
                  className="inline-flex items-center rounded-md bg-usaBlue text-white px-3 py-2 text-sm hover:opacity-90"
                >
                  View Details
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}