'use client'
import { useState } from 'react'

type Img = { src: string; caption: string }

export default function GalleryClient({ images }: { images: Img[] }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  const openAt = (idx: number) => { setI(idx); setOpen(true) }
  const next = (dir: number) => setI((i + dir + images.length) % images.length)

  const download = () => {
    const link = document.createElement('a')
    link.href = images[i].src
    link.download = images[i].src.split('/').pop() || 'image'
    link.click()
  }

  return (
    <>
      <div
        className="mx-auto grid max-w-6xl gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {images.map((img, idx) => (
          <button
            key={img.src}
            onClick={() => openAt(idx)}
            className="group text-left bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:-translate-y-1"
          >
            <img src={img.src} alt={img.caption} className="w-full block" loading="lazy" />
            <div className="bg-gray-100 px-3 py-2 text-sm text-center">{img.caption}</div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-3"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-3 right-4 text-white text-3xl"
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={images[i].src}
            alt={images[i].caption}
            className="max-w-[95%] max-h-[75vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="mt-3 max-w-[95%] bg-white rounded px-3 py-2 text-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {images[i].caption}
          </div>
          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button className="px-3 py-2 rounded bg-white" onClick={() => next(-1)}>❮ Prev</button>
            <button className="px-3 py-2 rounded bg-white" onClick={download}>⬇ Download</button>
            <button className="px-3 py-2 rounded bg-white" onClick={() => next(1)}>Next ❯</button>
          </div>
        </div>
      )}
    </>
  )
}