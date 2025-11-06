from pathlib import Path

readme_content = """# 🏆 National Cornhole Tournament Portal

The **National Cornhole Tournament Portal (NCO Portal)** is the unified platform for managing tournaments, divisions, player registrations, sponsor visibility, and merchandise sales for the **National Cornhole Organization**.  
It combines a **public website**, an **authenticated organizer/admin portal**, and **secure Supabase storage** — designed for professional tournament operations and community engagement.

---

## 🚀 Key Features

- **Tournament & Event Management**
  - Dynamic event pages (`/app/events/[slug]`)
  - Team and player registration, approvals, and notifications
- **Admin & Organizer Portal**
  - `/app/portal` provides authenticated dashboards for admins, organizers, and sponsors
- **Secure File Storage**
  - Role-based Supabase storage buckets for event logos, sponsor logos, avatars, and demo bag images
- **Public Demo Bag Gallery**
  - `/app/demo-gallery` shows publicly accessible event demo bags
- **E-Commerce Ready**
  - `/app/shop` integrated with NCO products and sponsorship assets
- **Serverless API Layer**
  - Next.js App Router API routes under `/app/portal/api` for modular back-end endpoints
- **Prisma ORM**
  - Type-safe database interaction for user profiles, events, and sponsors

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js (App Router) + TypeScript + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) + Prisma |
| **Deployment** | Vercel |
| **Auth** | Supabase Auth (roles: `user`, `organizer`, `admin`) |
| **Database Access** | Prisma Client via `safePrisma.ts` |
| **File Handling** | Supabase Storage with custom RLS policies |
| **Version Control** | Git + GitHub |

---

## 🗄️ Supabase Storage Guardrails

Each storage bucket enforces least-privilege access through Supabase Row Level Security (RLS):

| Bucket | Purpose | Access Control |
|---------|----------|----------------|
| `event-logos` | Official event logos | Public read; organizer/admin write |
| `sponsor-logos` | Sponsor branding | Public read; organizer/admin write |
| `avatars` | User profile images | Public read (optional toggle); user may only edit `${auth.uid()}/...` |
| `demo-bags` | Private event demo images | Private; admin, event organizers, and authorized viewers only |

RLS SQL policies are defined in  
`/supabase/migrations/storage_policies.sql`

---

## 📂 Folder Structure (live)

```plaintext
.
├── app/
│   ├── auth/                     # Supabase auth + callback route
│   ├── components/               # Shared components (RegisterButton, etc.)
│   ├── data/                     # Static JSON (clubs, sponsors, products)
│   ├── demo-gallery/             # Public demo bag viewer
│   ├── events/                   # Public event listings + [slug] routes
│   ├── lib/                      # Supabase & Prisma clients (supabaseClient.ts, safePrisma.ts)
│   ├── portal/                   # Authenticated admin/organizer portal
│   │   ├── admin/                # Admin dashboard
│   │   ├── api/                  # Serverless API endpoints
│   │   │   ├── events/, players/, sponsors/, users/
│   │   │   └── notify-approval/, webhooks/, zip/
│   │   ├── dashboard/            # Organizer dashboard page
│   │   ├── demo-bags/            # Organizer demo bag management
│   │   ├── org/                  # Organizer-level components & sub-routes
│   │   │   ├── events/, sponsors/, profile/
│   │   │   └── components/       # CreateEventButton, OrgSidebar, etc.
│   │   └── onboarding/           # First-time setup & profile wizard
│   ├── shop/                     # Storefront pages
│   ├── whoami/                   # Diagnostic route (current user)
│   ├── layout.tsx, page.tsx      # Global app entry
│   └── globals.css               # Global Tailwind styling
│
├── components/                   # Shared sitewide UI (Header, Footer, etc.)
│   └── ui/                       # Atomic UI pieces (Button, Badge, Spinner)
│
├── prisma/                       # Prisma schema and migrations
│   └── schema.prisma
│
├── public/                       # Public assets and preloaded demo bag images
│   ├── demo-bags/<Event>/images/ # Local event asset mirrors
│   ├── images/                   # Marketing images and logos
│   ├── data/                     # Static data JSON
│   └── favicon.ico
│
├── supabase/                     # Database migrations and RLS SQL
│   ├── migrations/
│   ├── seed/
│   └── policies/
│
├── middleware.ts                 # Next middleware (auth / routing guards)
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript settings
└── package.json
```

---

## ⚙️ Setup Instructions

1. **Clone and install**
   ```bash
   git clone https://github.com/NationalCornhole/portal.git
   cd portal
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

3. **Initialize the database**
   ```bash
   npx prisma migrate deploy
   # or if using Supabase CLI:
   supabase db push
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   App will start on [http://localhost:3000](http://localhost:3000)

---

## 🧑‍💻 Roles & Access Summary

| Role | Description | Typical Permissions |
|------|--------------|--------------------|
| **Admin** | NCO system owner | Full read/write across all events & sponsors |
| **Organizer** | Event host or regional lead | Can create events, upload assets, manage registrations |
| **User** | Player or attendee | Limited read access, profile management |
| **Viewer (demo_bag_viewers)** | External guest | Read-only access to event demo-bags |

---

## 🧪 Testing Checklist

| Action | Expected Result |
|--------|-----------------|
| Upload to `event-logos/` as admin | ✅ Success, visible via public URL |
| Upload to `demo-bags/<eventId>/` as organizer | ✅ Success |
| Upload to other event’s demo-bags | ❌ Blocked (RLS) |
| View `demo-bags/<eventId>/` as viewer | ✅ Signed URL read allowed |
| Write/delete as viewer | ❌ Blocked |

---

## 🌐 Deployment Notes

- Hosted on **Vercel**, using **Supabase** for backend.
- Use the `SUPABASE_SERVICE_ROLE_KEY` **only on server-side** routes.
- Public routes (`event-logos`, `sponsor-logos`) use unsigned URLs.
- Private routes (`demo-bags`) use signed URLs.
- Policies are idempotent and re-runnable from SQL migrations.

---

## 🧭 Future Enhancements

- [ ] Integrate Leaderboards
- [ ] Real-time scoring dashboard
- [ ] Automated RLS testing in CI/CD
- [ ] Full sponsor analytics module
- [ ] Role-based upload monitoring

---

## 📄 License
MIT © 2025 National Cornhole Organization

---

## 💡 Project Philosophy

Built for the love of **competition, craftsmanship, and community**.  
From backyards to national arenas, this portal powers the game we all love — one perfect bag at a time.
"""

output_path = Path("/mnt/data/README.md")
output_path.write_text(readme_content)
output_path.as_posix()