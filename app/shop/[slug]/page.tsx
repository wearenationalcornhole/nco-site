// app/shop/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';

type Product = {
  id: string;
  category: string;
  name: string;
  price: number;
  image: string;
  link: string;
};

async function getProducts(): Promise<Product[]> {
  const data = (await import('../../data/products.json')).default as Product[];
  return data;
}

function tail(href: string) {
  try {
    // '/shop/flashpoint' -> 'flashpoint'
    const parts = href.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
}

export default async function ProductPage(props: { params: { slug: string } } | { params: Promise<{ slug: string }> }) {
  const { slug } = await Promise.resolve((props as any).params);
  const all = await getProducts();

  // Match by id or by link tail
  const product =
    all.find((p) => p.id === slug) ||
    all.find((p) => tail(p.link) === slug) ||
    null;

  if (!product) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">Product not found</h1>
          <Link href="/shop" className="mt-4 inline-block text-white px-4 py-2 rounded" style={{ backgroundColor: '#0A3161' }}>
            ← Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div className="rounded-2xl bg-white shadow ring-1 ring-gray-100 p-4">
          <div className="relative w-full aspect-[4/3]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{product.category}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">${product.price.toFixed(2)}</div>
            </div>
          </div>

          {/* Placeholder marketing copy — adjust per product if you like */}
          <p className="mt-4 text-gray-700">
            Tournament-ready construction and consistent hand-feel. Built for control on the slow side and push power on the fast side.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <button
              className="rounded bg-[#0A3161] text-white px-5 py-2 font-medium"
              onClick={() => alert('Cart coming soon')}
            >
              Add to Cart
            </button>
            <Link href="/shop" className="text-[#0A3161] underline underline-offset-2">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}