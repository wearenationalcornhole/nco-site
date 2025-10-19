// app/lib/devStore.ts
// Tiny in-memory store for local dev & serverless fallbacks.
// Safe to import in API routes. No browser APIs, no I/O.

type AnyRecord = { id?: string; [k: string]: any }

export type TableName =
  | 'users'
  | 'events'
  | 'divisions'
  | 'sponsors'
  | 'eventSponsors'         // legacy camelCase link table
  | 'bagModels'
  | 'bagSubmissions'
  | 'registrations'
  // new(er) snake_case tables you actively use
  | 'sponsor_companies'
  | 'event_sponsors'
  | 'event_bag_submissions'
  | 'event_divisions'
  | 'event_division_members'
  // organizer profile / clubs
  | 'clubs'
  | 'club_members'

type StoreShape = Record<TableName, AnyRecord[]>

const STORAGE_SYMBOL = '__NCO_DEV_STORE__'

// Global, per-runtime (OK for Next dev / serverless fallbacks)
function getGlobalStore(): StoreShape {
  const g = globalThis as any
  if (!g[STORAGE_SYMBOL]) {
    g[STORAGE_SYMBOL] = createDefaultData()
  }
  return g[STORAGE_SYMBOL] as StoreShape
}

function createDefaultData(): StoreShape {
  return {
    // legacy / existing
    users: [],
    events: [],
    divisions: [],
    sponsors: [],
    eventSponsors: [],
    bagModels: [],
    bagSubmissions: [],
    registrations: [],

    // sponsors (current)
    sponsor_companies: [],
    event_sponsors: [],
    event_bag_submissions: [],

    // divisions (current)
    event_divisions: [],
    event_division_members: [],

    // clubs (organizer profile)
    clubs: [],
    club_members: [],
  }
}

function genId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`
}

export const devStore = {
  reset(): void {
    const g = globalThis as any
    g[STORAGE_SYMBOL] = createDefaultData()
  },

  getAll<T = AnyRecord>(table: TableName): T[] {
    const store = getGlobalStore()
    return store[table] as T[]
  },

  getById<T = AnyRecord>(table: TableName, id: string): T | undefined {
    const store = getGlobalStore()
    return (store[table] as AnyRecord[]).find((r) => r.id === id) as T | undefined
  },

  upsert<T extends AnyRecord = AnyRecord>(table: TableName, record: T): T {
    const store = getGlobalStore()
    const rows = store[table]

    if (!record.id) {
      const created: AnyRecord = { ...record, id: genId(table.replace(/[^a-z]/g, '')) }
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
    const rows = store[table]
    const before = rows.length
    store[table] = rows.filter((r) => r.id !== id)
    return store[table].length !== before
  },
}