// app/lib/devStore.ts
'use client'

type TableName =
  | 'users' | 'events' | 'divisions'
  | 'sponsors' | 'eventSponsors'
  | 'bagModels' | 'bagSubmissions'

const defaultData: Record<TableName, any[]> = {
  users: [],
  events: [],
  divisions: [],
  sponsors: [],
  eventSponsors: [],
  bagModels: [],
  bagSubmissions: [],
}

function loadFromLocal<T>(key: TableName): T[] {
  if (typeof window === 'undefined') return defaultData[key] as T[]
  try {
    const raw = window.localStorage.getItem(`nco:${key}`)
    return raw ? (JSON.parse(raw) as T[]) : defaultData[key]
  } catch {
    return defaultData[key]
  }
}

function saveToLocal<T>(key: TableName, data: T[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`nco:${key}`, JSON.stringify(data))
}

export const devStore = {
  getAll<T>(key: TableName): T[] {
    return loadFromLocal<T>(key)
  },
  upsert<T extends { id?: string }>(key: TableName, item: T): T {
    const list = loadFromLocal<T & { id: string }>(key)
    const id = item.id ?? crypto.randomUUID()
    const existingIdx = list.findIndex(i => i.id === id)
    const next = { ...item, id } as T & { id: string }
    if (existingIdx >= 0) list[existingIdx] = next
    else list.unshift(next)
    saveToLocal(key, list)
    return next
  },
  remove(key: TableName, id: string) {
    const list = loadFromLocal<any>(key).filter((i: any) => i.id !== id)
    saveToLocal(key, list)
  },
  setAll<T>(key: TableName, data: T[]) {
    saveToLocal(key, data as any[])
  }
}