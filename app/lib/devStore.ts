// app/lib/devStore.ts
// Simple in-memory fallback for development and Vercel serverless builds.

type AnyRecord = { id?: string; [k: string]: any }

// ✅ Add both 'clubs' and 'club_members' for organizer profile features
export type TableName =
  | 'users'
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
  | 'club_members' // <-- NEW for organizer profiles

type StoreShape = Record<TableName, AnyRecord[]>

const STORAGE_SYMBOL = '__NCO_DEV_STORE__'

function createDefaultData(): StoreShape {
  return {
    users: [],
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
    club_members: [], // ✅ Added
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