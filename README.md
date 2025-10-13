# NCO Site — Red/White/Blue Edition (Phase 1)

## Prereqs (Mac)
1) Install Node.js (LTS) from https://nodejs.org
2) Open **Terminal**

## Run locally
```bash
cd ~/Desktop
unzip ~/Downloads/nco-rwb-site.zip -d .
cd nco-rwb-site/nco-site-rwb
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel
1) Push to GitHub (or import directly via Vercel)
```bash
git init
git add -A
git commit -m "NCO RWB initial"
```
Create a repo on GitHub and push, or use `gh repo create` if you have GitHub CLI.

2) In Vercel: **New Project → Import** your repo → **Deploy**

3) Add your domain in **Settings → Domains** and follow the DNS steps.

## Where to edit
- `app/page.tsx` — Homepage
- `app/events/page.tsx` — Events grid (mock data now)
- `app/portal/login/page.tsx` — Portal login placeholder
- `components/*` — Header, Footer, EventCard
- `public/images/*` — Replace placeholders with real assets

## Colors
- Old Glory Red: `#B31942`
- White: `#FFFFFF`
- Old Glory Blue: `#0A3161`
