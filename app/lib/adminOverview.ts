import { getPrisma } from '@/app/lib/safePrisma'
import { getUsersModel } from '@/app/lib/prismaModels'
import { devStore, type DevProfileRecord } from '@/app/lib/devStore'
import { getStripeClient } from '@/app/lib/stripe'
import { listStoreProducts } from '@/app/lib/store/catalog'
import { getConfiguredSiteUrl, getSupabaseServiceRoleKey } from '@/app/lib/site'
import { getProfileDisplayName } from '@/app/lib/profileCapabilities'
import {
  getPaymentOverviewTotals,
  getPersistenceCapabilities,
  listRecentPaymentAuditActions,
  listRecentEventRegistrationPayments,
  listRecentStoreOrders,
} from '@/app/lib/paymentPersistence'
import {
  getWebhookDeliveryStats,
  hasWebhookDeliveryPersistence,
  listRecentWebhookDeliveryLogs,
} from '@/app/lib/webhookDeliveries'
import { listDisplayIdentitiesByIds } from '@/app/lib/profileIdentity'

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
    storeOrderCount: number
    refundedStoreOrderCount: number
    storeRevenueCents: number
    eventPaymentCount: number
    paidEventPaymentCount: number
    pendingEventPaymentCount: number
    refundedEventPaymentCount: number
    cancelledEventPaymentCount: number
    eventRevenueCents: number
    webhookDeliveries: number
    failedWebhookDeliveries: number
    retryableWebhookFailures: number
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
    paymentAuditPersistence: boolean
    webhookLogPersistence: boolean
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
  recentStoreOrders: Array<{
    id: string
    stripeSessionId: string
    email: string | null
    status: string
    currency: string
    subtotalAmount: number
    totalAmount: number
    itemCount: number
    createdAt: string | null
  }>
  recentEventPayments: Array<{
    id: string
    eventId: string
    eventTitle: string
    eventSlug: string | null
    userId: string
    userName: string
    email: string | null
    registrationId: string | null
    stripeCheckoutSessionId: string
    amountCents: number
    currency: string
    status: string
    createdAt: string | null
  }>
  recentPaymentActions: Array<{
    id: string
    kind: string
    action: string
    targetId: string
    actorUserId: string | null
    actorName: string
    actorRole: string | null
    eventId: string | null
    eventTitle: string | null
    storeOrderId: string | null
    paymentId: string | null
    registrationId: string | null
    statusBefore: string | null
    statusAfter: string | null
    stripeRefundId: string | null
    note: string | null
    createdAt: string | null
  }>
  recentWebhookDeliveries: Array<{
    id: string
    provider: string
    source: string
    route: string
    attemptKind: string
    eventType: string | null
    status: string
    stripeEventId: string | null
    stripeCheckoutSessionId: string | null
    stripePaymentIntentId: string | null
    eventId: string | null
    userId: string | null
    registrationId: string | null
    httpStatus: number | null
    errorMessage: string | null
    note: string | null
    retryParentLogId: string | null
    createdAt: string | null
    processedAt: string | null
    retryable: boolean
  }>
}

type CheckoutSummary = AdminOverviewData['recentCheckouts'][number]

type ProfileSummary = {
  id: string
  role: Role | null
  display_name?: string | null
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

async function getProfilesFromSupabase() {
  const admin = await getSupabaseAdminSafe()
  if (!admin) return null

  const { data, error } = await admin
    .from('profiles')
    .select('id,role,display_name,first_name,last_name,email')
    .order('first_name', { ascending: true })

  if (error) return null
  return (data ?? []) as ProfileSummary[]
}

function toProfileSummaryMap(profiles: Array<ProfileSummary | DevProfileRecord>) {
  return new Map(
    profiles
      .filter((profile): profile is ProfileSummary & { id: string } => Boolean(profile?.id))
      .map((profile) => [
        profile.id,
        {
          name: getProfileDisplayName({
            display_name: profile.display_name ?? null,
            first_name: profile.first_name ?? null,
            last_name: profile.last_name ?? null,
            email: profile.email ?? null,
          }),
          email: profile.email ?? null,
        },
      ]),
  )
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
  const products = await listStoreProducts(true)
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
  const [capabilities, paymentTotals, recentStoreOrders, recentEventPayments, recentPaymentActions, webhookStats, webhookLogPersistence, recentWebhookDeliveries] = await Promise.all([
    getPersistenceCapabilities(),
    getPaymentOverviewTotals(),
    listRecentStoreOrders(8),
    listRecentEventRegistrationPayments(8),
    listRecentPaymentAuditActions(10),
    getWebhookDeliveryStats(),
    hasWebhookDeliveryPersistence(),
    listRecentWebhookDeliveryLogs(12),
  ])

  if (prisma) {
    const Users = getUsersModel(prisma)
    const [profiles, users, events, registrations, clubs, recentCheckouts] = await Promise.all([
      getProfilesFromSupabase(),
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

    const userMap = await listDisplayIdentitiesByIds(
      Array.from(new Set(((users as any[]) ?? []).map((user) => user.id))),
      (users as any[]).map((user) => ({
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        role: user.role ?? null,
      })),
    )
    const profileRows = profiles ?? []
    const profileMap = toProfileSummaryMap(profileRows)
    const eventMap = new Map<string, string>(
      (events as any[]).map((event) => [event.id, event.title ?? 'Untitled Event']),
    )
    const registrationUserIds = Array.from(new Set((registrations as RegistrationSummary[]).map((registration) => registration.user_id)))
    const registrationIdentityMap = await listDisplayIdentitiesByIds(
      registrationUserIds,
      (users as any[]).map((user) => ({
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        role: user.role ?? null,
      })),
    )

    return {
      stats: {
        players:
          profileRows.length > 0
            ? profileRows.filter((profile) => profile.role === 'player' || !profile.role).length
            : (users as any[]).filter((user) => user.role === 'player' || !user.role).length,
        organizers:
          profileRows.length > 0
            ? profileRows.filter((profile) => profile.role === 'organizer').length
            : (users as any[]).filter((user) => user.role === 'organizer').length,
        admins:
          profileRows.length > 0
            ? profileRows.filter((profile) => profile.role === 'admin').length
            : (users as any[]).filter((user) => user.role === 'admin').length,
        clubs,
        events: events.length,
        upcomingEvents: (events as any[]).filter((event) => isUpcomingDate(event.date)).length,
        registrations: await prisma.registrations.count(),
        storeProducts: products.length,
        featuredProducts: products.filter((product) => product.featured).length,
        storeOrderCount: paymentTotals.storeOrderCount,
        refundedStoreOrderCount: paymentTotals.refundedStoreOrderCount,
        storeRevenueCents: paymentTotals.storeRevenueCents,
        eventPaymentCount: paymentTotals.eventPaymentCount,
        paidEventPaymentCount: paymentTotals.paidEventPaymentCount,
        pendingEventPaymentCount: paymentTotals.pendingEventPaymentCount,
        refundedEventPaymentCount: paymentTotals.refundedEventPaymentCount,
        cancelledEventPaymentCount: paymentTotals.cancelledEventPaymentCount,
        eventRevenueCents: paymentTotals.eventRevenueCents,
        webhookDeliveries: webhookStats.total,
        failedWebhookDeliveries: webhookStats.failed + webhookStats.configIssues,
        retryableWebhookFailures: webhookStats.retryableFailures,
      },
      config,
      capabilities: {
        ...capabilities,
        webhookLogPersistence,
      },
      recentRegistrations: (registrations as RegistrationSummary[]).map((registration) => {
        const user = registrationIdentityMap.get(registration.user_id) ?? profileMap.get(registration.user_id) ?? userMap.get(registration.user_id)
        return {
          id: registration.id ?? `${registration.event_id}-${registration.user_id}`,
          eventTitle: eventMap.get(registration.event_id) ?? 'Untitled Event',
          userName: user?.name ?? registration.user_id,
          email: user?.email ?? null,
          createdAt: asIso(registration.created_at),
        }
      }),
      recentCheckouts,
      recentStoreOrders,
      recentEventPayments,
      recentPaymentActions,
      recentWebhookDeliveries,
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
  const fallbackProfiles = profileRows.length > 0 ? profileRows : devStore.listProfiles()
  const profileMap = toProfileSummaryMap(fallbackProfiles)
  const devUsers = await listDisplayIdentitiesByIds(
    Array.from(new Set(devRegistrations.map((registration) => registration.user_id))),
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
      storeOrderCount: paymentTotals.storeOrderCount,
      refundedStoreOrderCount: paymentTotals.refundedStoreOrderCount,
      storeRevenueCents: paymentTotals.storeRevenueCents,
      eventPaymentCount: paymentTotals.eventPaymentCount,
      paidEventPaymentCount: paymentTotals.paidEventPaymentCount,
      pendingEventPaymentCount: paymentTotals.pendingEventPaymentCount,
      refundedEventPaymentCount: paymentTotals.refundedEventPaymentCount,
      cancelledEventPaymentCount: paymentTotals.cancelledEventPaymentCount,
      eventRevenueCents: paymentTotals.eventRevenueCents,
      webhookDeliveries: webhookStats.total,
      failedWebhookDeliveries: webhookStats.failed + webhookStats.configIssues,
      retryableWebhookFailures: webhookStats.retryableFailures,
    },
    config,
    capabilities: {
      ...capabilities,
      webhookLogPersistence,
    },
    recentRegistrations: devRegistrations.slice(0, 8).map((registration) => {
      const user = profileMap.get(registration.user_id) ?? devUsers.get(registration.user_id)
      return {
        id: registration.id ?? `${registration.event_id}-${registration.user_id}`,
        eventTitle: eventMap.get(registration.event_id) ?? 'Untitled Event',
        userName: user?.name ?? registration.user_id,
        email: user?.email ?? null,
        createdAt: asIso(registration.created_at),
      }
    }),
    recentCheckouts,
    recentStoreOrders,
    recentEventPayments,
    recentPaymentActions,
    recentWebhookDeliveries,
  }
}
