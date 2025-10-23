export type DemoGallery = {
  title: string
  logo?: string
  images: { src: string; caption: string }[]
}

export const DEMO_GALLERIES: Record<string, DemoGallery> = {
  Rotary2025: {
    title: '2025 Rotary Club Tournament Demos',
    logo: '/demo-bags/Rotary2025/images/NCOLOGO.png',
    images: [
      { src: '/demo-bags/Rotary2025/images/demo.png',  caption: 'Rotary Tournament Bag Orange' },
      { src: '/demo-bags/Rotary2025/images/demo2.png', caption: 'Rotary Tournament Bag Blue'   },
      // add more...
    ],
  },
  Emerald2025: {
    title: 'Emerald — 21 September 2025',
    logo: '/demo-bags/Emerald2025/images/Logo.png',
    images: [
      { src: '/demo-bags/Emerald2025/images/Logo.png', caption: 'Emerald Logo' },
    ],
  },
  Habitat2025: {
    title: 'Loudon Habitat for Humanity — 27 September 2025',
    logo: '/demo-bags/Habitat2025/images/Logo.png',
    images: [
      { src: '/demo-bags/Habitat2025/images/Logo.png', caption: 'Habitat Logo' },
    ],
  },
  Raventek2025: {
    title: "Raventek's Cornament",
    logo: '/demo-bags/Raventek2025/images/Logo.png',
    images: [
      { src: '/demo-bags/Raventek2025/images/Logo.png', caption: 'Raventek' },
    ],
  },
  SHMC2025: {
    title: 'SHMC Tournament — 21 September 2025',
    logo: '/demo-bags/SHMC2025/images/Logo.png',
    images: [
      { src: '/demo-bags/SHMC2025/images/Logo.png', caption: 'Emerald Logo' },
      { src: '/demo-bags/SHMC2025/images/demo.png',  caption: 'SHMC Tournament Bag Orange' },
      { src: '/demo-bags/SHMC2025/images/demo2.png', caption: 'SHMC Tournament Bag Blue'   },
      
    ],
  },
}