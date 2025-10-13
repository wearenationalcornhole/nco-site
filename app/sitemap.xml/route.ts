import products from '@/app/data/products.json'
import events from '@/app/data/events.json'

type Product = { link: string }
type EventItem = { slug: string }

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
  'https://wearenationalcornhole.com'

export async function GET() {
  const baseRoutes = ['/', '/events', '/portal/login', '/shop']

  const productRoutes = (products as Product[])
    .map(p => p.link)
    .filter(Boolean)

  const eventRoutes = (events as EventItem[])
    .map(e => `/events/${e.slug}`)

  const routes = [...new Set([...baseRoutes, ...productRoutes, ...eventRoutes])]

  const now = new Date().toISOString()

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    routes
      .map(
        (path) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : path.startsWith('/events/') ? '0.8' : '0.7'}</priority>
  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}