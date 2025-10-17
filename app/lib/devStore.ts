// app/lib/devStore.ts
// Tiny in-memory store for local dev & serverless fallbacks.
// Safe to import in API routes. No browser APIs, no I/O.

type AnyRecord = { id?: string; [k: string]: any }

// Keep both legacy camelCase and new snake_case keys so nothing breaks.
export type TableName =
  | 'users'
  | 'events'
  | 'divisions'
  | 'sponsors'
  | 'eventSponsors'     // legacy camelCase
  | 'bagModels'
  | 'bagSubmissions'
  | 'registrations'
  | 'sponsor_companies' // new snake_case
  | 'event_sponsors'    // new snake_case
  | 'event_bag_submissions'

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
    // legacy / existing tables
    users: [],
    events: [],
    divisions: [],
    sponsors: [],
    eventSponsors: [],   // legacy camelCase link table
    bagModels: [],
    bagSubmissions: [],
    registrations: [],

    // new sponsor tables (snake_case to match DB)
    sponsor_companies: [],
    event_sponsors: [],

    // new bags submissions table (snake_case to match DB)
    event_bag_submissions: [],
  }
}

function genId(prefix = 'id'): string {
  // Simple unique-ish id for dev usage
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
      // create
      const created: AnyRecord = { ...record, id: genId(table.replace(/[^a-z]/gi, '')) }
      rows.push(created)
      return created as T
    }

    // update if exists
    const idx = rows.findIndex((r) => r.id === record.id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...record }
      return rows[idx] as T
    }

    // else insert
    rows.push(record)
    return record
  },

  /**
   * Replace an existing row by id. Returns the updated row or undefined if not found.
   */
  replace<T extends AnyRecord = AnyRecord>(table: TableName, id: string, next: T): T | undefined {
    const store = getGlobalStore()
    const rows = store[table]
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return undefined
    rows[idx] = { ...rows[idx], ...next }
    return rows[idx] as T
  },

  /**
   * Remove by id; optional predicate lets you assert a parent relation (e.g., same event_id).
   * Returns true if a row was removed.
   */
  remove(table: TableName, id: string, predicate?: (row: AnyRecord) => boolean): boolean {
    const store = getGlobalStore()
    const rows = store[table]
    const before = rows.length
    store[table] = rows.filter((r) => {
      if (r.id !== id) return true
      if (predicate && !predicate(r)) return true
      return false
    })
    return store[table].length !== before
  },
}