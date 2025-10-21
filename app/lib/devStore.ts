// app/lib/devStore.ts
// Tiny in-memory store for local dev & serverless fallbacks.
// Safe to import in API routes. No browser APIs, no I/O.

type AnyRecord = { id?: string; [k: string]: any }

export type TableName =
  | 'users'
  | 'events'
  | 'divisions'
  | 'sponsors'
  | 'eventSponsors'           // legacy camelCase
  | 'bagModels'
  | 'bagSubmissions'
  | 'registrations'
  | 'sponsor_companies'       // new snake_case
  | 'event_sponsors'          // new snake_case
  | 'event_bag_submissions'   // new snake_case
  | 'event_divisions'         // divisions per event
  | 'event_division_members'  // members per event division
  | 'division_assignments'    // <-- NEW: used by assignments route

type StoreShape = Record<TableName, AnyRecord[]>

const STORAGE_SYMBOL = '__NCO_DEV_STORE__'

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

    // new / snake_case
    sponsor_companies: [],
    event_sponsors: [],
    event_bag_submissions: [],

    // divisions subsystem
    event_divisions: [],
    event_division_members: [],

    // assignments for divisions (dev fallback)
    division_assignments: [], // <-- NEW
  }
}

function getGlobalStore(): StoreShape {
  const g = globalThis as any
  if (!g[STORAGE_SYMBOL]) {
    g[STORAGE_SYMBOL] = createDefaultData()
  }
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
    const lenBefore = rows.length
    store[table] = rows.filter((r) => r.id !== id)
    return store[table].length !== lenBefore
  },
}