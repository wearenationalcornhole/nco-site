'use client'
import Link from 'next/link'
import { useState } from 'react'
import { devStore } from '@/app/lib/devStore'

type Event = { id?: string; title: string; slug: string; city?: string; date?: string }

export default function OrgEvents() {
  const [form, setForm] = useState<Event>({ title: '', slug: '', city: '', date: '' })
  const events = devStore.getAll<Event>('events')

  function createEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.slug) return
    devStore.upsert<Event>('events', form)
    setForm({ title: '', slug: '', city: '', date: '' })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">My Events</h1>

      <form onSubmit={createEvent} className="border rounded-xl bg-white p-4 grid sm:grid-cols-4 gap-3 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
        <input className="border rounded px-3 py-2" placeholder="Slug (unique)" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))}/>
        <input className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/>
        <input className="border rounded px-3 py-2" placeholder="Date (YYYY-MM-DD)" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        <div className="sm:col-span-4">
          <button className="rounded-full bg-usaBlue text-white px-4 py-2">Create</button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(e => (
          <div key={e.slug} className="border rounded-xl bg-white p-4">
            <div className="font-semibold">{e.title}</div>
            <div className="text-sm text-gray-600">{e.city} · {e.date}</div>
            <div className="mt-3 flex gap-2">
              <Link className="rounded-full border px-3 py-1" href={`/portal/org/events/${e.slug}`}>Manage</Link>
              <Link className="rounded-full border px-3 py-1" href={`/portal/events/${e.slug}`}>View Public</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}