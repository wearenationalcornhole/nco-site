// app/page.tsx
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EventCard from '@/components/EventCard'
import events from '@/app/data/events.json'
import products from '@/app/data/products.json'
import sponsors from '@/app/data/sponsors.json'
import type { Metadata } from 'next'

export const generateMetadata = async (): Promise<Metadata> => ({
  title: 'Home',
  description: 'Tournaments, clubs, rankings, and official NCO gear.',
  alternates: { canonical: '/' },
  openGraph: { images: ['/opengraph-image.png'] },
  twitter: { images: ['/twitter-image.png'] },
})

function fmtDate(iso: string) {
  // timezone-stable to avoid hydration mismatches
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type Product = { id: string; category: string; name: string; price: number; image: string; link: string }
type Sponsor = { name: string; logo: string; url: string }

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-usaBlue/75 text-usaWhite">
          <img
            src="/images/hero-cornhole.webp"
            alt="Backyard cornhole game"
            className="absolute inset-0 -z-10 h-full w-full object-cover mix-blend-multiply opacity-80"
            loading="eager"
          />
          {/* Optional extra overlay (keep commented unless you want stronger blue)
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-usaBlue/80 via-usaBlue/70 to-usaBlue/90" />
          */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 text-center">
            <p className="uppercase tracking-widest text-white/80 text-xs sm:text-sm">National Cornhole Organization</p>
            <h1 className="mx-auto max-w-4xl font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl">
              Tournaments, Clubs &amp; Gear — All in One Place
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-white/90">
              Discover events near you, register in seconds, and throw with gear built to win.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/events" className="inline-flex items-center justify-center rounded-full bg-usaRed px-6 py-3 font-semibold text-white hover:bg-[#8F1732]">
                Find Events
              </a>
              <a href="#shop" className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 font-semibold text-white/90 hover:bg-white/10">
                Shop Bags
              </a>
              <a href="/portal" className="inline-flex items-center justify-center rounded-full bg-white text-usaBlue px-6 py-3 font-semibold hover:bg-white/90">
                Open Portal
              </a>
            </div>
          </div>
        </section>

        {/* Flag stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-usaRed via-usaWhite to-usaBlue" />

        {/* About */}
        <section id="about" className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">About the NCO</h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-700">
                The National Cornhole Organization elevates the sport through competition, craftsmanship, and community.
              </p>
            </div>
          </div>
        </section>

        {/* Tournaments preview */}
        <section id="tournaments" className="py-16 sm:py-20 bg-ncoGray">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4 mb-8">
              <h2 className="text-3xl sm:text-4xl font-semibold">Upcoming Tournaments</h2>
              <a href="/portal/events" className="hidden sm:inline-block text-sm font-medium text-usaBlue hover:text-usaRed">
                Browse all in Portal
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 3).map((e: any) => (
                <EventCard
                  key={`${e.title}-${e.date}`}
                  title={e.title}
                  subtitle={`${e.city} • ${fmtDate(e.date)}`}
                  image={e.image}
                  href={`/events/${e.slug}`} // keep if your EventCard supports href
                />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <a href="/portal/events" className="inline-flex items-center justify-center rounded-full border border-usaBlue/30 px-5 py-2 font-semibold text-usaBlue hover:bg-usaBlue/5">
                Browse all in Portal
              </a>
            </div>
          </div>
        </section>

        {/* Shop */}
        <section id="shop" className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-8">Shop Official NCO Gear</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {(products as Product[]).slice(0, 6).map((p) => (
                <article key={p.id} className="group rounded-2xl bg-neutral-100 p-6 shadow-soft hover:shadow transition">
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      loading="lazy"
                    />
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

        {/* Sponsors */}
        <section id="sponsors" className="py-10 bg-white border-t">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-sm font-semibold text-gray-600 uppercase tracking-wider">
              Sponsors &amp; Partners
            </h2>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 items-center gap-6">
              {(sponsors as Sponsor[]).map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  className="flex items-center justify-center opacity-80 hover:opacity-100 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="h-10 w-auto object-contain grayscale hover:grayscale-0"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Portal CTA strip */}
        <section id="portal" className="py-14 bg-usaBlue text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Player &amp; Tournament Portal</h3>
                <p className="text-white/90">
                  Register for events, manage sponsors, and review demo bags — all in one place.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="/portal"
                  className="inline-flex items-center justify-center rounded-full bg-white text-usaBlue px-6 py-3 font-bold hover:bg-white/90"
                >
                  Open Portal
                </a>
                <a
                  href="/portal/events"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  Browse Events
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}