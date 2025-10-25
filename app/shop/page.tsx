// app/shop/page.tsx
import Link from 'next/link';
import Image from 'next/image';

type Product = {
  id: string;
  category: string;
  name: string;
  price: number;
  image: string; // e.g. /images/shop/flashpoint.png
  link: string;  // e.g. /shop/flashpoint
};

async function getProducts(): Promise<Product[]> {
  const data = (await import('../data/products.json')).default as Product[];
  return data;
}

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
      <header className="text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/nco-mark.png" alt="NCO" className="mx-auto mb-4 h-12" />
        <h1 className="text-3xl font-semibold text-[#0A3161]">Shop</h1>
        <p className="text-gray-600 mt-1">Bags, apparel, and more.</p>
      </header>

      <div
        className="mx-auto grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', maxWidth: 1100 }}
      >
        {products.map((p) => (
          <Link
            key={p.id}
            href={p.link || `/shop/${p.id}`}
            className="group block rounded-2xl bg-white shadow ring-1 ring-gray-100 hover:-translate-y-0.5 hover:shadow-lg transition"
          >
            <div className="relative h-56 w-full">
              <Image
                src={p.image}
                alt={p.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-4"
              />
            </div>
            <div className="px-4 pb-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">{p.category}</div>
              <h2 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-[#0A3161]">
                {p.name}
              </h2>
              <div className="mt-2 text-lg font-semibold text-gray-900">${p.price.toFixed(2)}</div>
            </div>
          </Link>
        ))}
        {products.length === 0 && (
          <div className="text-center text-gray-600 col-span-full">No products available yet.</div>
        )}
      </div>
    </main>
  );
}