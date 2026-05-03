import events from '@/app/data/events.json'
import { getConfiguredSiteUrl } from '@/app/lib/site'
import { listStoreProducts } from '@/app/lib/store/catalog'

type EventItem = { slug: string }

const SITE = getConfiguredSiteUrl()

export async function GET() {
  const baseRoutes = ['/', '/about', '/events', '/portal/login', '/privacy', '/shop', '/terms']

  const products = await listStoreProducts()
  const productRoutes = products.map((product) => `/shop/${product.slug}`)

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
