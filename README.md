# Family Care Hub

A shared coordination app for a family caring for an elderly or chronically ill relative. It keeps appointments, prescriptions, reports, tasks and updates in one place, and shows who is doing what.

**All data in this app is sample data. The app gives no medical advice. Clinical decisions stay with doctors.** See the About page in the app for details.

## What it does
- Sign up and sign in with Supabase Auth.
- Create a care circle for one relative, invite members by existing email, and assign roles: Coordinator, Caregiver, Viewer.
- Record care recipients, appointments, prescriptions (dose and schedule stored exactly as written) and reports (PDF or image, stored privately).
- Mark reports Standard or Restricted. Restricted reports are visible only to coordinators and caregivers, enforced in the database.
- Tasks with owner, due date and status (to do, in progress, done, blocked).
- Refill warnings when a refill date is within 7 days (date arithmetic only).
- A circle dashboard with upcoming appointments, open tasks, refills due and recent activity.
- A printable handoff summary that excludes documents.

## Tech stack
- Next.js (App Router, TypeScript, Tailwind CSS)
- Supabase: Postgres, row-level security, Auth, private Storage
- Vitest for the RLS test suite
- Netlify for hosting (see the deployment section)

## Setup

### 1. Create a Supabase project
Create a new project in the Supabase dashboard. Note the project URL and the anon and service role keys (Settings > API).

### 2. Run the migrations in the SQL Editor, one at a time, in order
Run each file in the SQL Editor, in this order:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_phase2.sql`
3. `supabase/migrations/0003_guard_coordinators.sql`
4. `supabase/migrations/0004_records.sql`
5. `supabase/migrations/0005_tasks.sql`
6. `supabase/migrations/0006_privacy_fixes.sql`

Migrations are not re-runnable. If one fails partway, reset the project before running it again.

### 3. Set environment variables and create the demo users
Copy `.env.example` to `.env.local` (git-ignored) and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: used by the app in the browser. These are the only two needed for hosting.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`: used by the tests and the demo-user script only. The service role key bypasses row-level security. Never commit it or expose it to the browser.
- `DEMO_PASSWORD`: at least 8 characters.

Then, from the family-care-hub folder, run `node scripts/create-demo-users.mjs`. It creates the three demo users if they do not exist and writes `supabase/seed.final.sql`, which is git-ignored.

### 4. Seed the sample data
Run `supabase/seed.final.sql` in the SQL Editor.

### 5. Install and run
    npm install
    npm run dev

Open http://localhost:3000 and sign in with a demo user.

### 6. Run the tests
    npm test

See the Tests section below.

## Tests
    npm test

The RLS suite runs against your Supabase project using the three `SUPABASE_*` variables in `.env.local`. If any of them is not set, the suite is skipped with a message.

Other checks:
- Type-check: `npx tsc --noEmit`
- Production build: `npm run build`

## Deployment
Netlify is the host. Build command: `npm run build`. Set only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify's environment settings. Do not set `SUPABASE_SERVICE_ROLE_KEY` on the host.

## Limitations
- Prototype only. Not certified for HIPAA, GDPR health data or any clinical use.
- Email reminders are not implemented; reminders appear on the dashboard only.
- Invites work only for accounts that already exist.
- The 375px mobile layout has not been checked in a browser.

## How AI was used
This project was built with an AI coding assistant. It planned the phases, wrote the Next.js pages, Supabase migrations, server actions and RLS tests, and ran the type check and build. The owner ran the migrations and tests against their own Supabase project and reviewed the app in a browser. Access rules and the SQL should be reviewed by a qualified person before any real use.
