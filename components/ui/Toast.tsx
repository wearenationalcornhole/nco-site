'use client'
import { useEffect, useState } from 'react'

export default function Toast({ message, kind='success', onDone }:{message:string; kind?:'success'|'error'; onDone?:()=>void}) {
  const [show,setShow]=useState(true)
  useEffect(()=>{ const t=setTimeout(()=>{ setShow(false); onDone?.() }, 2500); return ()=>clearTimeout(t) },[onDone])
  if(!show) return null
  const base = kind==='success' ? 'bg-green-600' : 'bg-red-600'
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className={`text-white px-4 py-2 rounded-lg shadow ${base}`}>{message}</div>
    </div>
  )
}