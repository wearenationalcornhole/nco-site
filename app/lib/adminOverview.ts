import { getPrisma } from '@/app/lib/safePrisma'
import { getUsersModel } from '@/app/lib/prismaModels'
import { devStore } from '@/app/lib/devStore'
import { getStripeClient } from '@/app/lib/stripe'
import { getAllProducts } from '@/app/lib/store/catalog'
import { getConfiguredSiteUrl, getSupabaseServiceRoleKey } from '@/app/lib/site'

type Role = 'player' | 'organizer' | 'admin'

export type AdminOverviewData = {
  stats: {
    players: number
    organizers: number
    admins: number
    clubs: number
    events: number
    upcomingEvents: number
    registrations: number
    storeProducts: number
    featuredProducts: number
  }
  config: {
    siteUrl: string
    hasSupabaseUrl: boolean
    hasSupabaseAnonKey: boolean
    hasSupabaseServiceRole: boolean
    hasDatabaseUrl: boolean
    hasStripeSecretKey: boolean
    hasStripeWebhookSecret: boolean
  }
  capabilities: {
    storeOrderPersistence: boolean
    eventPaymentPersistence: boolean
  }
  recentRegistrations: Array<{
    id: string
    eventTitle: string
    userName: string
    email: string | null
    createdAt: string | null
  }>
  recentCheckouts: Array<{
    id: string
    type: 'store' | 'event' | 'other'
    status: string
    paymentStatus: string
    amountTotal: number | null
    currency: string | null
    customerEmail: string | null
    createdAt: string | null
  }>
}

type CheckoutSummary = AdminOverviewData['recentCheckouts'][number]

type ProfileSummary = {
  id: string
  role: Role | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

type EventSummary = {
  id: string
  title: string | null
  date: string | Date | null
}

type RegistrationSummary = {
  id?: string
  event_id: string
  user_id: string
  created_at: string | Date | null
}

type UserSummary = {
  id: string
  email: string | null
  name: string | null
}

async function getSupabaseAdminSafe() {
  try {
    const mod = await import('@/app/lib/supabaseAdmin')
    return mod.supabaseAdmin
  } catch {
    return null
  }
}

function asIso(value: string | Date | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function isUpcomingDate(value: string | Date | null | undefined) {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() >= today.getTime()
}

function getCapabilities() {
  return {
    storeOrderPersistence: false,
    eventPaymentPersistence: false,
  }
}

async function getProfilesFromSupabase() {
  const admin = await getSupabaseAdminSafe()
  if (!admin) return null

  const { data, error } = await admin
    .from('profiles')
    .select('id,role,first_name,last_name,email')
    .order('first_name', { ascending: true })

  if (error) return null
  return (data ?? []) as ProfileSummary[]
}

async function getEventsFromSupabase() {
  const admin = await getSupabaseAdminSafe()
  if (!admin) return null

  const { data, error } = await admin
    .from('events')
    .select('id,title,date')
    .order('date', { ascending: false })

  if (error) return null
  return (data ?? []) as EventSummary[]
}

async function getClubsCountFromSupabase() {
  const admin = await getSupabaseAdminSafe()
  if (!admin) return null

  const { count, error } = await admin.from('clubs').select('id', { head: true, count: 'exact' })
  if (error) return null
  return count ?? 0
}

async function getStripeCheckoutSummaries(): Promise<CheckoutSummary[]> {
  const stripe = getStripeClient()
  if (!stripe) return []

  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 10 })
    return sessions.data.map((session) => {
      const source = session.metadata?.source
      const mode = session.metadata?.mode
      const type: CheckoutSummary['type'] =
        source === 'nco-store-mvp'
          ? 'store'
          : mode === 'event_registration'
          ? 'event'
          : 'other'

      return {
        id: session.id,
        type,
        status: session.status ?? 'unknown',
        paymentStatus: session.payment_status ?? 'unknown',
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
        customerEmail:
          session.customer_details?.email ??
          session.customer_email ??
          null,
        createdAt: session.created ? new Date(session.created * 1000).toISOString() : null,
      }
    })
  } catch {
    return []
  }
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const products = getAllProducts()
  const config = {
    siteUrl: getConfiguredSiteUrl(),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasSupabaseServiceRole: Boolean(getSupabaseServiceRoleKey()),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasStripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  }

  const prisma = await getPrisma()

  if (prisma) {
    const Users = getUsersModel(prisma)
    const [users, events, registrations, clubs, recentCheckouts] = await Promise.all([
      Users
        ? Users.findMany({
            select: { id: true, email: true, name: true, role: true },
          })
        : Promise.resolve([]),
      prisma.events.findMany({
        select: { id: true, title: true, date: true },
        orderBy: { date: 'desc' },
      }),
      prisma.registrations.findMany({
        select: { id: true, event_id: true, user_id: true, created_at: true },
        orderBy: { created_at: 'desc' },
        take: 8,
      }),
      prisma.clubs.count(),
      getStripeCheckoutSummaries(),
    ])

    const userMap = new Map<string, UserSummary>(
      (users as any[]).map((user) => [
        user.id,
        { id: user.id, email: user.email ?? null, name: user.name ?? null },
      ]),
    )
    const eventMap = new Map<string, string>(
      (events as any[]).map((event) => [event.id, event.title ?? 'Untitled Event']),
    )

    return {
      stats: {
        players: (users as any[]).filter((user) => user.role === 'player' || !user.role).length,
        organizers: (users as any[]).filter((user) => user.role === 'organizer').length,
        admins: (users as any[]).filter((user) => user.role === 'admin').length,
        clubs,
        events: events.length,
        upcomingEvents: (events as any[]).filter((event) => isUpcomingDate(event.date)).length,
        registrations: await prisma.registrations.count(),
        storeProducts: products.length,
        featuredProducts: products.filter((product) => product.featured).length,
      },
      config,
      capabilities: getCapabilities(),
      recentRegistrations: (registrations as RegistrationSummary[]).map((registration) => {
        const user = userMap.get(registration.user_id)
        return {
          id: registration.id ?? `${registration.event_id}-${registration.user_id}`,
          eventTitle: eventMap.get(registration.event_id) ?? 'Untitled Event',
          userName: user?.name ?? user?.email ?? registration.user_id,
          email: user?.email ?? null,
          createdAt: asIso(registration.created_at),
        }
      }),
      recentCheckouts,
    }
  }

  const [profiles, events, clubsCount, recentCheckouts] = await Promise.all([
    getProfilesFromSupabase(),
    getEventsFromSupabase(),
    getClubsCountFromSupabase(),
    getStripeCheckoutSummaries(),
  ])

  const profileRows = profiles ?? []
  const eventRows = events ?? []
  const devRegistrations = devStore
    .getAll<RegistrationSummary>('registrations')
    .sort((a, b) => (asIso(b.created_at) ?? '').localeCompare(asIso(a.created_at) ?? ''))
  const devUsers = new Map<string, UserSummary>(
    devStore.getAll<any>('users').map((user) => [
      user.id,
      { id: user.id, email: user.email ?? null, name: user.name ?? null },
    ]),
  )
  const eventMap = new Map<string, string>(eventRows.map((event) => [event.id, event.title ?? 'Untitled Event']))

  return {
    stats: {
      players: profileRows.filter((profile) => profile.role === 'player' || !profile.role).length,
      organizers: profileRows.filter((profile) => profile.role === 'organizer').length,
      admins: profileRows.filter((profile) => profile.role === 'admin').length,
      clubs: clubsCount ?? devStore.getAll('clubs').length,
      events: eventRows.length || devStore.getAll('events').length,
      upcomingEvents:
        eventRows.filter((event) => isUpcomingDate(event.date)).length ||
        devStore.getAll<any>('events').filter((event) => isUpcomingDate(event.date)).length,
      registrations: devRegistrations.length,
      storeProducts: products.length,
      featuredProducts: products.filter((product) => product.featured).length,
    },
    config,
    capabilities: getCapabilities(),
    recentRegistrations: devRegistrations.slice(0, 8).map((registration) => {
      const user = devUsers.get(registration.user_id)
      return {
        id: registration.id ?? `${registration.event_id}-${registration.user_id}`,
        eventTitle: eventMap.get(registration.event_id) ?? 'Untitled Event',
        userName: user?.name ?? user?.email ?? registration.user_id,
        email: user?.email ?? null,
        createdAt: asIso(registration.created_at),
      }
    }),
    recentCheckouts,
  }
}
