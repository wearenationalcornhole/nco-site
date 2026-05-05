// app/robots.ts
import type { MetadataRoute } from 'next'
import { getConfiguredSiteUrl } from '@/app/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', disallow: ['/portal/'] },
    ],
    sitemap: `${getConfiguredSiteUrl()}/sitemap.xml`,
  }
}
