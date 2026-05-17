export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'

const tournaments = [
  {
    slug: 'Rotary2025',
    name: 'Rotary Club 2025 — 28 September 2025',
    img: '/demo-bags/Rotary2025/images/logo.png',
  },
  {
    slug: 'Emerald2025',
    name: 'Emerald — 21 September 2025',
    img: '/demo-bags/Emerald2025/images/Logo.png',
  },
  {
    slug: 'Habitat2025',
    name: 'Loudon Habitat for Humanity — 27 September 2025',
    img: '/demo-bags/Habitat2025/images/Logo.png',
  },
  {
    slug: 'Raventek2025',
    name: "Raventek's Cornament",
    img: '/demo-bags/Raventek2025/images/Logo.png',
  },
  {
    slug: 'SHMC2025',
    name: "Strength & Honor MC Tournament",
    img: '/demo-bags/SHMC2025/images/logo.jpg',
  },
]

export default function DemoBagsIndex() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
      <meta name="robots" content="noindex,nofollow" />

      <header className="text-center mb-12">
        <Image
          src="/images/nco-mark.webp"
          alt="National Cornhole Logo"
          width={64}
          height={64}
          className="mx-auto mb-4 h-16 w-16"
        />
        <h1 className="text-3xl font-semibold text-[#0A3161]">
          Cornhole Tournament Bag Demos
        </h1>
      </header>

      <div
        className="mx-auto grid gap-8"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', maxWidth: 1000 }}
      >
        {tournaments.map((t) => (
          <Link
            key={t.slug}
            href={`/portal/demo-bags/${t.slug}`}
            className="group block bg-white rounded-2xl shadow-md hover:-translate-y-1 hover:shadow-xl transition transform text-center p-6"
          >
            <Image
              src={t.img}
              alt={t.name}
              width={256}
              height={128}
              className="mx-auto mb-4 h-32 w-auto object-contain rounded-lg"
            />
            <p className="text-gray-800 font-medium group-hover:text-[#0A3161]">
              {t.name}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
