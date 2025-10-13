import Header from '@/components/Header'
import Footer from '@/components/Footer'
import products from '@/app/data/products.json'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Official NCO gear — bags, apparel, and accessories.',
  alternates: { canonical: '/shop' },
  openGraph: { images: ['/opengraph-image.png'] },
  twitter: { images: ['/twitter-image.png'] },
}

type Product = { id: string; category: string; name: string; price: number; image: string; link: string }

export default function ShopIndex() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <section className="border-b bg-usaBlue text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl sm:text-4xl font-bold">Shop</h1>
            <p className="mt-2 text-white/80">Official NCO gear — bags, apparel, and accessories.</p>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(products as Product[]).map((p) => (
                <article key={p.id} className="group rounded-2xl bg-neutral-100 p-6 shadow-soft hover:shadow transition">
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold">{p.name}</h3>
                  <p className="text-gray-600">{p.category}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold">${p.price.toFixed(2)}</span>
                    <a href={p.link} className="rounded-full bg-usaRed px-5 py-2 font-semibold text-white hover:bg-[#8F1732]">
                      View
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}