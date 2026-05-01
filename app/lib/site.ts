import { headers } from 'next/headers'

const DEFAULT_SITE_URL = 'https://wearenationalcornhole.com'

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getConfiguredSiteUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.APP_ORIGIN ??
      DEFAULT_SITE_URL
  )
}

export async function getRequestOrigin() {
  const requestHeaders = await headers()
  const host =
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    process.env.VERCEL_URL

  if (!host) return getConfiguredSiteUrl()

  const proto =
    requestHeaders.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https')

  return stripTrailingSlash(`${proto}://${host}`)
}

export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    null
  )
}
