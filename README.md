# Berea International Seventh-day Adventist Church — Website

Next.js (App Router) + Tailwind CSS + Framer Motion, with **Firebase** (Firestore,
Authentication, Storage) as the content database and a built-in `/admin` area so
non-developers can edit the site without touching code.

## Stack

- **Next.js 16** (TypeScript, App Router)
- **Tailwind CSS v4** — navy/white theme matching gc.adventist.org
- **Framer Motion** — 3D tilt-on-hover cards
- **Firebase** — Firestore (content), Authentication (Google sign-in for admins),
  Cloud Storage (uploaded photos)

## Getting started

```bash
cp .env.local.example .env.local   # then fill it in (see below)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Firebase configured the
site still renders using the placeholder content in `src/lib/fallback-data.ts`.

## One-time Firebase setup

In the [Firebase console](https://console.firebase.google.com) for your project:

1. **Firestore Database** → Create database → *production mode*. The default
   deny-all rules are correct: the website and `/admin` read and write through the
   server (Admin SDK), never directly from the browser.
2. **Authentication** → Get started → Sign-in method → enable **Google**.
3. **Storage** → Get started. Needed for photo uploads (may require the
   pay-as-you-go plan; the free monthly allowance is ample for a church site).
4. **Project settings → Service accounts → Generate new private key.** Copy the
   values into `.env.local` (see `.env.local.example`). **Never commit that JSON
   file** — it is git-ignored, but treat it like a password.
5. Set `ADMIN_EMAILS` in `.env.local` to the Google accounts allowed into `/admin`.

## Editing content

Go to **`/admin`** and sign in with an allowed Google account.

| Screen | What it edits |
| --- | --- |
| Site settings | Homepage hero photo, small heading, main heading, subtitle |
| Section cards | The big homepage cards (Departments, Services, Resources) |
| Ministry cards | Cards inside each section (Pathfinders, Adventurers, …): add, edit, reorder, move between sections, delete |
| Events | Camps, trainings and other programs: poster, dates, venue, costs, contact, and when to show them |

Changes appear on the live site within seconds. Photos are resized in the browser
before upload (max 5 MB; JPG, PNG or WebP).

To give someone access, add their Google email to `ADMIN_EMAILS` and redeploy.

### Events

Events appear as a row of up to 3 cards under the homepage hero (only when there is
at least one), on `/events`, and on their own page at `/events/{slug}`.

**When an event shows.** All dates are South African dates (Africa/Johannesburg), so
events appear and expire at midnight in Johannesburg wherever the server runs.

| Setting | Effect |
| --- | --- |
| Published (unticked = draft) | Drafts are visible to nobody but admins |
| Start promoting on | First day the event is listed. Blank = straight away |
| Stop promoting after | Last day it is listed. Blank = the event's own last day |

- An event's own page opens as soon as it is published and past its start-promoting
  date. After the event ends the page stays reachable (so old shared links work) and
  says "This event has ended"; it just leaves the lists.
- "Stop promoting after" only removes the card from the lists, not the page.
- The rules live in `src/lib/events/dates.ts`. Run `npm test` to check them; the
  tests run under three different server time zones to prove the dates don't depend
  on where the site is hosted.

**Share previews.** Event pages carry Open Graph tags so WhatsApp/Facebook show the
poster. Messaging apps skip very large images, so the preview uses a resized copy,
which needs the site's public address: set `NEXT_PUBLIC_SITE_URL` (picked up
automatically on Vercel).

### Security model

- `/admin` pages, data functions and Server Actions each re-check the session
  (`src/lib/admin/auth.ts`); a missing check in one place can't expose the others.
- Sign-in uses Google; the server exchanges the ID token for an `httpOnly`
  session cookie (5 days) and only admits emails in `ADMIN_EMAILS`.
- Firestore rules deny all direct browser access.
- `/admin` is marked `noindex`.

## Data model (Firestore)

| Path | Fields |
| --- | --- |
| `siteSettings/main` | `heroHeadline`, `heroEyebrow`, `heroSubtitle`, `heroImageUrl` |
| `sections/{slug}` | `title`, `description`, `icon`, `imageUrl`, `order` |
| `ministries/{slug}` | `title`, `slug`, `description`, `icon`, `imageUrl`, `order`, `sectionSlug` |
| `events/{slug}` | `title`, `slug`, `summary`, `description`, `imageUrl`, `startDate`, `startTime`, `endDate`, `endTime`, `venue`, `costs`, `contactName`, `contactPhone`, `published`, `showFrom`, `showUntil` |

A ministry appears on the page of the section whose `slug` equals its `sectionSlug`
(e.g. `departments` → `/departments`, with its own page at `/departments/{slug}`).

## Project structure

```
src/
  app/
    (site)/                  # public pages, wrapped in Header + Footer
      page.tsx                 # homepage: hero + section cards
      departments/ services/ resources/   # section listing pages
      [section]/[slug]/        # card detail pages, e.g. /departments/pathfinders
      events/ events/[slug]/   # event list and event pages
    admin/
      login/                   # Google sign-in
      (panel)/                 # signed-in screens + Server Actions (actions.ts)
    api/admin/session/       # ID token -> session cookie
  components/                # site components; admin/ holds the admin forms
  lib/
    content.ts               # public Firestore reads (+ fallback)
    fallback-data.ts
    firebase/                # admin.ts (server), client.ts (browser sign-in)
    admin/                   # auth, data access, storage, validation
    events/                  # dates.ts (rules), content.ts (reads), types.ts
    site-url.ts              # public address, for share previews
```

## Deploying (e.g. Vercel)

Set every variable from `.env.local.example` in the host's dashboard. For
`FIREBASE_PRIVATE_KEY`, paste the key with its `\n` sequences. Then add the
production domain in Firebase console → Authentication → Settings →
**Authorised domains**, or Google sign-in will fail on the live site.
