// app/lib/devStore.ts
// Minimal localStorage-backed store for dev-only data.
// Used when Prisma/Supabase aren't available (local dev).

type TableName =
  | 'users'
  | 'events'
  | 'divisions'
  | 'sponsors'
  | 'eventSponsors'
  | 'bagModels'
  | 'bagSubmissions'
  | 'registrations' // ← NEW

type AnyRecord = Record<string, any> & { id?: string }

const STORAGE_KEY = 'nco-dev-store-v1'

const defaultData: Record<TableName, AnyRecord[]> = {
  users: [],
  events: [],
  divisions: [],
  sponsors: [],
  eventSponsors: [],
  bagModels: [],
  bagSubmissions: [],
  registrations: [], // ← NEW
}

function load(): Record<TableName, AnyRecord[]> {
  if (typeof window === 'undefined') return { ...defaultData }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultData }
    const parsed = JSON.parse(raw)
    // Ensure all tables exist
    for (const key of Object.keys(defaultData) as TableName[]) {
      if (!Array.isArray(parsed[key])) parsed[key] = []
    }
    return parsed
  } catch {
    return { ...defaultData }
  }
}

function save(state: Record<TableName, AnyRecord[]>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

let state = load()

function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const devStore = {
  reset() {
    state = { ...defaultData }
    save(state)
  },

  getAll<T = AnyRecord>(table: TableName): T[] {
    return (state[table] as T[]) ?? ([] as T[])
  },

  setAll<T = AnyRecord>(table: TableName, rows: T[]) {
    state[table] = rows as AnyRecord[]
    save(state)
  },

  upsert<T extends AnyRecord = AnyRecord>(table: TableName, row: T): T {
    const rows = this.getAll<T>(table)
    let id = row.id as string | undefined
    if (!id) id = genId()
    const idx = rows.findIndex((r: any) => r.id === id)
    const next = { ...row, id } as T
    if (idx === -1) {
      rows.push(next)
    } else {
      rows[idx] = { ...rows[idx], ...next }
    }
    this.setAll<T>(table, rows)
    return next
  },

  remove(table: TableName, id: string) {
    const rows = this.getAll(table).filter((r: any) => r.id !== id)
    this.setAll(table, rows)
  },
}