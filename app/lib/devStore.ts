// app/lib/devStore.ts
// Simple in-memory fallback for development and Vercel serverless builds.

type AnyRecord = { id?: string; [k: string]: any }

export type DevLegacyUserRecord = {
  id?: string
  email?: string | null
  name?: string | null
  profile_image?: string | null
  city?: string | null
  state?: string | null
  role?: string | null
  created_at?: string | null
}

export type DevProfileRecord = {
  id?: string
  email?: string | null
  role?: string | null
  created_at?: string | null
  updated_at?: string | null
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  phone?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  organization?: string | null
  avatar_url?: string | null
  club?: string | null
  primary_club_id?: string | null
  bio?: string | null
  skill_level?: string | null
  favorite_bag_style?: string | null
  dominant_hand?: string | null
  home_venue?: string | null
  profile_visibility?: string | null
  is_profile_complete?: boolean | null
  completed_at?: string | null
}

export type TableName =
  | 'users'
  | 'profiles'
  | 'events'
  | 'divisions'
  | 'sponsors'
  | 'eventSponsors'
  | 'bagModels'
  | 'bagSubmissions'
  | 'registrations'
  | 'sponsor_companies'
  | 'event_sponsors'
  | 'event_bag_submissions'
  | 'event_divisions'
  | 'event_division_members'
  | 'division_assignments'
  | 'clubs'
  | 'club_members'
  | 'club_memberships'
  | 'store_products'
  | 'store_product_images'
  | 'store_orders'
  | 'store_order_items'
  | 'event_registration_payments'
  | 'payment_action_audit_logs'
  | 'webhook_delivery_logs'
  | 'bag_designs'
  | 'bag_design_assets'

type StoreShape = Record<TableName, AnyRecord[]>

const STORAGE_SYMBOL = '__NCO_DEV_STORE__'

function createDefaultData(): StoreShape {
  return {
    users: [],
    profiles: [],
    events: [],
    divisions: [],
    sponsors: [],
    eventSponsors: [],
    bagModels: [],
    bagSubmissions: [],
    registrations: [],
    sponsor_companies: [],
    event_sponsors: [],
    event_bag_submissions: [],
    event_divisions: [],
    event_division_members: [],
    division_assignments: [],
    clubs: [], // ✅ Added
    club_members: [],
    club_memberships: [],
    store_products: [],
    store_product_images: [],
    store_orders: [],
    store_order_items: [],
    event_registration_payments: [],
    payment_action_audit_logs: [],
    webhook_delivery_logs: [],
    bag_designs: [],
    bag_design_assets: [],
  }
}

function getGlobalStore(): StoreShape {
  const g = globalThis as any
  if (!g[STORAGE_SYMBOL]) g[STORAGE_SYMBOL] = createDefaultData()
  return g[STORAGE_SYMBOL] as StoreShape
}

function genId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function splitLegacyName(name: string | null | undefined) {
  const trimmed = name?.trim()
  if (!trimmed) return { first_name: null, last_name: null }

  const parts = trimmed.split(/\s+/)
  return {
    first_name: parts[0] ?? null,
    last_name: parts.length > 1 ? parts.slice(1).join(' ') : null,
  }
}

function profileFromLegacyUser(user: DevLegacyUserRecord): DevProfileRecord {
  const names = splitLegacyName(user.name)
  return {
    id: user.id,
    email: user.email ?? null,
    role: user.role ?? null,
    created_at: user.created_at ?? null,
    updated_at: user.created_at ?? null,
    first_name: names.first_name,
    last_name: names.last_name,
    display_name: user.name ?? null,
    phone: null,
    city: user.city ?? null,
    region: user.state ?? null,
    country: null,
    organization: null,
    avatar_url: user.profile_image ?? null,
    club: null,
    primary_club_id: null,
    bio: null,
    skill_level: null,
    favorite_bag_style: null,
    dominant_hand: null,
    home_venue: null,
    profile_visibility: 'public',
    is_profile_complete: false,
    completed_at: null,
  }
}

export const devStore = {
  reset(): void {
    const g = globalThis as any
    g[STORAGE_SYMBOL] = createDefaultData()
  },

  getAll<T = AnyRecord>(table: TableName): T[] {
    return getGlobalStore()[table] as T[]
  },

  getById<T = AnyRecord>(table: TableName, id: string): T | undefined {
    return getGlobalStore()[table].find((r) => r.id === id) as T | undefined
  },

  listProfiles(): DevProfileRecord[] {
    const explicit = this.getAll<DevProfileRecord>('profiles')
    const byId = new Map<string, DevProfileRecord>()

    for (const profile of explicit) {
      if (profile.id) byId.set(profile.id, profile)
    }

    for (const user of this.getAll<DevLegacyUserRecord>('users')) {
      if (user.id && !byId.has(user.id)) {
        byId.set(user.id, profileFromLegacyUser(user))
      }
    }

    return Array.from(byId.values())
  },

  getProfileById(id: string): DevProfileRecord | undefined {
    return this.listProfiles().find((profile) => profile.id === id)
  },

  getProfileByEmail(email: string): DevProfileRecord | undefined {
    const normalized = normalizeEmail(email)
    if (!normalized) return undefined
    return this.listProfiles().find((profile) => normalizeEmail(profile.email) === normalized)
  },

  upsert<T extends AnyRecord>(table: TableName, record: T): T {
    const store = getGlobalStore()
    const rows = store[table]
    if (!record.id) {
      const created = { ...record, id: genId(table.replace(/[^a-z]/g, '')) }
      rows.push(created)
      return created as T
    }
    const idx = rows.findIndex((r) => r.id === record.id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...record }
      return rows[idx] as T
    }
    rows.push(record)
    return record
  },

  remove(table: TableName, id: string): boolean {
    const store = getGlobalStore()
    const before = store[table].length
    store[table] = store[table].filter((r) => r.id !== id)
    return store[table].length < before
  },
}
