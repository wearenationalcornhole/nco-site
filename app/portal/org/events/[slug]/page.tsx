'use client'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { devStore } from '@/app/lib/devStore'

type SponsorTier = 'TITLE' | 'GOLD' | 'SILVER' | 'BRONZE' | 'OTHER'

type Event = { id?: string; title: string; slug: string; city?: string; date?: string }
type Sponsor = { id?: string; name: string; website?: string; logoUrl: string }
type EventSponsor = { id?: string; eventId: string; sponsorId: string; tier: SponsorTier; position: number }

type BagModel = { id?: string; vendorName: string; modelName: string; description?: string; coverUrl?: string }
type BagSubmission = { id?: string; bagModelId: string; eventId: string; status: 'SUBMITTED'|'APPROVED'|'REJECTED'; approvedForProduction: boolean; notes?: string }

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-3 py-1 rounded-full border ${active ? 'bg-black text-white' : 'bg-white'}`}>{children}</button>
}

export default function ManageEvent() {
  const { slug } = useParams<{ slug: string }>()
  const event = useMemo(() => devStore.getAll<Event>('events').find(e => e.slug === slug), [slug])
  const [tab, setTab] = useState<'overview'|'sponsors'|'bags'>('overview')
  const [eventId, setEventId] = useState<string>('')

  // Ensure event has a stable id; if missing, create one and persist to devStore.
  useEffect(() => {
    if (!event) return
    let id = event.id
    if (!id) {
      id = crypto.randomUUID()
      devStore.upsert<Event>('events', { ...event, id })
    }
    setEventId(id)
  }, [event])

  if (!event) {
    return <div className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-xl font-bold">Event not found.</h1></div>
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">{event.title}</h1>

      <div className="mt-4 flex gap-2">
        <TabButton active={tab==='overview'} onClick={()=>setTab('overview')}>Overview</TabButton>
        <TabButton active={tab==='sponsors'} onClick={()=>setTab('sponsors')}>Sponsors</TabButton>
        <TabButton active={tab==='bags'} onClick={()=>setTab('bags')}>Demo Bags</TabButton>
      </div>

      <div className="mt-6">
        {tab === 'overview' && <Overview event={event} />}
        {tab === 'sponsors' && eventId && <SponsorsTab eventId={eventId} />}
        {tab === 'bags' && eventId && <BagsTab eventId={eventId} />}
      </div>
    </div>
  )
}

function Overview({ event }: { event: Event }) {
  return (
    <div className="border rounded-xl bg-white p-4">
      <p className="text-gray-700">This is your event control center. Use the tabs to manage sponsors and demo bags.</p>
      {event.city || event.date ? (
        <p className="mt-2 text-sm text-gray-600">
          {event.city ? <>Location: {event.city}</> : null}
          {event.city && event.date ? ' • ' : null}
          {event.date ? <>Date: {event.date}</> : null}
        </p>
      ) : null}
    </div>
  )
}

function SponsorsTab({ eventId }: { eventId: string }) {
  const [sForm, setSForm] = useState<Sponsor>({ name: '', website: '', logoUrl: '' })
  const sponsors = devStore.getAll<Sponsor>('sponsors')
  const links = devStore.getAll<EventSponsor>('eventSponsors').filter(l => l.eventId === eventId)

  function createSponsor(e: React.FormEvent) {
    e.preventDefault()
    const s = devStore.upsert<Sponsor>('sponsors', sForm)
    setSForm({ name: '', website: '', logoUrl: '' })
    devStore.upsert<EventSponsor>('eventSponsors', { eventId, sponsorId: (s as any).id, tier: 'OTHER', position: 0 })
  }
  function attach(sponsorId: string, tier: SponsorTier) {
    devStore.upsert<EventSponsor>('eventSponsors', { eventId, sponsorId, tier, position: 0 })
  }
  function detach(link: EventSponsor) {
    devStore.remove('eventSponsors', (link as any).id)
  }

  const byId = Object.fromEntries(sponsors.map(s => [(s as any).id, s]))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="border rounded-xl bg-white p-4">
        <h3 className="font-semibold mb-3">Create Sponsor</h3>
        <form onSubmit={createSponsor} className="grid gap-2">
          <input className="border rounded px-3 py-2" placeholder="Sponsor name" value={sForm.name} onChange={e=>setSForm(f=>({...f,name:e.target.value}))}/>
          <input className="border rounded px-3 py-2" placeholder="Website (https://...)" value={sForm.website} onChange={e=>setSForm(f=>({...f,website:e.target.value}))}/>
          <input className="border rounded px-3 py-2" placeholder="Logo URL" value={sForm.logoUrl} onChange={e=>setSForm(f=>({...f,logoUrl:e.target.value}))}/>
          <button className="rounded-full bg-usaBlue text-white px-4 py-2">Save Sponsor</button>
        </form>

        <h4 className="mt-5 font-semibold">Sponsor Library</h4>
        <ul className="mt-2 space-y-2">
          {sponsors.map((s: any) => (
            <li key={s.id} className="flex items-center justify-between border rounded p-2">
              <div className="flex items-center gap-3">
                <img src={s.logoUrl || '/images/tournament-1.webp'} className="h-8 w-8 rounded bg-white object-contain" alt={s.name}/>
                <div>
                  <div className="font-medium">{s.name}</div>
                  {s.website && <a className="text-xs text-blue-600" href={s.website} target="_blank">{s.website}</a>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="border rounded px-2 py-1" onClick={()=>attach(s.id,'GOLD')}>Attach (Gold)</button>
                <button className="border rounded px-2 py-1" onClick={()=>attach(s.id,'OTHER')}>Attach</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border rounded-xl bg-white p-4">
        <h3 className="font-semibold mb-3">Event Sponsors</h3>
        <ul className="space-y-2">
          {links.map((l:any) => (
            <li key={l.id} className="flex items-center justify-between border rounded p-2">
              <div className="flex items-center gap-3">
                <img src={byId[l.sponsorId]?.logoUrl || '/images/tournament-2.webp'} className="h-8 w-8 rounded bg-white object-contain" alt={byId[l.sponsorId]?.name}/>
                <div>
                  <div className="font-medium">{byId[l.sponsorId]?.name}</div>
                  <div className="text-xs text-gray-500">{l.tier}</div>
                </div>
              </div>
              <button className="border rounded px-2 py-1" onClick={()=>detach(l)}>Remove</button>
            </li>
          ))}
          {links.length === 0 && <p className="text-gray-600">No sponsors attached yet.</p>}
        </ul>
      </section>
    </div>
  )
}

function BagsTab({ eventId }: { eventId: string }) {
  const [modelForm, setModelForm] = useState<BagModel>({ vendorName: '', modelName: '', description: '', coverUrl: '' })
  const [note, setNote] = useState('')
  const models = devStore.getAll<BagModel>('bagModels')
  const subs = devStore.getAll<BagSubmission>('bagSubmissions').filter(s => s.eventId === eventId)

  function createModel(e: React.FormEvent) {
    e.preventDefault()
    const m = devStore.upsert<BagModel>('bagModels', modelForm)
    setModelForm({ vendorName: '', modelName: '', description: '', coverUrl: '' })
    devStore.upsert<BagSubmission>('bagSubmissions', {
      bagModelId: (m as any).id, eventId, status: 'SUBMITTED', approvedForProduction: false, notes: ''
    })
  }

  function setStatus(id: string, status: 'APPROVED'|'REJECTED') {
    const list = devStore.getAll<BagSubmission>('bagSubmissions').map((s:any)=> s.id===id ? { ...s, status } : s)
    devStore.setAll('bagSubmissions', list)
  }
  function toggleProd(id: string) {
    const list = devStore.getAll<BagSubmission>('bagSubmissions').map((s:any)=> s.id===id ? { ...s, approvedForProduction: !s.approvedForProduction } : s)
    devStore.setAll('bagSubmissions', list)
  }
  function saveNotes(id: string) {
    const list = devStore.getAll<BagSubmission>('bagSubmissions').map((s:any)=> s.id===id ? { ...s, notes: note } : s)
    devStore.setAll('bagSubmissions', list)
    setNote('')
  }

  const byId = Object.fromEntries(models.map(m => [(m as any).id, m]))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="border rounded-xl bg-white p-4">
        <h3 className="font-semibold mb-3">Submit Bag Model (demo)</h3>
        <form onSubmit={createModel} className="grid gap-2">
          <input className="border rounded px-3 py-2" placeholder="Vendor name" value={modelForm.vendorName} onChange={e=>setModelForm(f=>({...f,vendorName:e.target.value}))}/>
          <input className="border rounded px-3 py-2" placeholder="Model name" value={modelForm.modelName} onChange={e=>setModelForm(f=>({...f,modelName:e.target.value}))}/>
          <input className="border rounded px-3 py-2" placeholder="Cover image URL" value={modelForm.coverUrl} onChange={e=>setModelForm(f=>({...f,coverUrl:e.target.value}))}/>
          <textarea className="border rounded px-3 py-2" placeholder="Description" value={modelForm.description} onChange={e=>setModelForm(f=>({...f,description:e.target.value}))}/>
          <button className="rounded-full bg-usaBlue text-white px-4 py-2">Create &amp; Submit</button>
        </form>
      </section>

      <section className="border rounded-xl bg-white p-4">
        <h3 className="font-semibold mb-3">Submissions for this Event</h3>
        <ul className="space-y-3">
          {subs.map((s:any) => (
            <li key={s.id} className="border rounded p-3">
              <div className="flex items-start gap-3">
                <img src={byId[s.bagModelId]?.coverUrl || '/images/tournament-3.webp'} className="h-16 w-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-medium">{byId[s.bagModelId]?.vendorName} — {byId[s.bagModelId]?.modelName}</div>
                  <div className="text-sm text-gray-600">Status: {s.status}{s.approvedForProduction ? ' • Production OK' : ''}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-full bg-green-600 text-white px-3 py-1" onClick={()=>setStatus(s.id,'APPROVED')}>Approve</button>
                    <button className="rounded-full bg-rose-600 text-white px-3 py-1" onClick={()=>setStatus(s.id,'REJECTED')}>Reject</button>
                    <button className="rounded-full border px-3 py-1" onClick={()=>toggleProd(s.id)}>
                      {s.approvedForProduction ? 'Unset Production' : 'Approve for Production'}
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Notes…" className="border rounded px-2 py-1 flex-1"/>
                    <button className="border rounded px-3" onClick={()=>saveNotes(s.id)}>Save</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {subs.length === 0 && <p className="text-gray-600">No submissions yet.</p>}
        </ul>
      </section>
    </div>
  )
}