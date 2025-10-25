// app/demo-gallery/config.ts
export type DemoGallery = {
  title: string;
  logo?: string | null;
  images: { src: string; caption?: string }[];
};

// Map a short slug -> gallery
export const DEMO_GALLERIES: Record<string, DemoGallery> = {
  // example slugs — replace with your real ones
  rotary2025: {
    title: 'Rotary Club 2025 — Bag Demos',
    logo: '/images/NCOLOGO.png',
    images: [
      { src: '/images/demo_bags/rotary2025/v1-front.webp', caption: 'V1 — Front' },
      { src: '/images/demo_bags/rotary2025/v1-back.webp',  caption: 'V1 — Back'  },
    ],
  },
  emerald2025: {
    title: 'Emerald 2025 — Bag Demos',
    logo: '/images/NCOLOGO.png',
    images: [
      { src: '/images/demo_bags/emerald2025/mock-1.webp' },
      { src: '/images/demo_bags/emerald2025/mock-2.webp' },
    ],
  },
};