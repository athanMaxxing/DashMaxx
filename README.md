# DashMaxx

Squad dashboard: Overwatch match tracker, weekly scheduling matrix, and a bounty board.
Vite + React, Tailwind CSS, Supabase, react-router-dom, lucide-react. Deploys to GitHub Pages.

## Setup

1. Fill in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://kngnjxsfvorxlplfndzf.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```
2. `npm install`
3. `npm run dev` and open http://localhost:5173/DashMaxx/

## Deploy

`npm run deploy` builds to `dist/` and pushes it to the `gh-pages` branch of
https://github.com/athanMaxxing/DashMaxx. The site lives at https://athanmaxxing.github.io/DashMaxx/.
The anon key is baked into the bundle at build time, so `.env.local` must be filled in before deploying.

In Supabase → Authentication → URL Configuration, add the GitHub Pages URL to the Site URL / redirect URLs.

## Routing

Uses `HashRouter` (`/#/login`, `/#/`) because GitHub Pages has no SPA fallback for deep links.

## Database

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. It creates the five tables,
the signup trigger that fills `profiles.username`, and RLS policies.

## Schema assumptions

Column names the gadgets expect are documented at the top of each file in `src/components/gadgets/`.
Edit the constants there (`STAT_FIELDS`, `DAYS`, select strings) if your tables differ.
