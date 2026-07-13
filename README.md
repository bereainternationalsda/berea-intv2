# Berea Seventh-day Adventist Church — Website

Next.js (App Router) + Tailwind CSS + Framer Motion, with Sanity as the
content management system so non-developers can edit cards and pages without
touching code.

## Stack

- **Next.js 16** (TypeScript, App Router)
- **Tailwind CSS v4** for styling (navy/white theme matching gc.adventist.org)
- **Framer Motion** for the 3D tilt-on-hover cards
- **Sanity** as a headless CMS, embedded directly at `/studio` (no separate
  deployment needed)

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site runs out of the
box using built-in placeholder content (`src/lib/fallback-data.ts`) even
before Sanity is configured, so you can see the homepage, Departments page,
and ministry cards immediately.

## Connecting the CMS

1. Log in and create a Sanity project:
   ```bash
   npx sanity login
   npx sanity init
   ```
   When asked, choose "Create new project," pick the `production` dataset,
   and say no to a default schema (this repo already has one).

2. Copy the env template and fill in your project ID:
   ```bash
   cp .env.local.example .env.local
   ```
   Set `NEXT_PUBLIC_SANITY_PROJECT_ID` to the ID printed by `sanity init`.

3. Restart the dev server. The site now reads from your live Sanity dataset
   instead of the placeholder data (falling back automatically if a query
   returns nothing).

4. Visit `http://localhost:3000/studio` and log in with the same Sanity
   account to add/edit content directly — no separate CMS deployment.

### Content model

- **Site Settings** (`siteSettings`) — a singleton document controlling the
  homepage hero: image, eyebrow text, headline, and subtitle. Only one of
  these exists; the Studio prevents creating a second one.
- **Homepage Section** (`section`) — the 3 hero cards (Departments, Services,
  Resources). Each has a `slug` that becomes its page route.
- **Ministry** (`ministry`) — the sub-page cards (Pathfinders, Adventurers,
  Family Life, Ambassador, Children's Ministries, Adventist Community
  Services, etc.). Each references a parent `Homepage Section`.

### Optional: seed starter content via script

Instead of typing everything into the Studio by hand, you can push the same
starter content (site settings + 3 sections + 6 ministries) programmatically:

1. Create an API token with **Editor** permissions at
   [sanity.io/manage](https://sanity.io/manage) → your project → API → Tokens.
2. Add it to `.env.local` as `SANITY_API_WRITE_TOKEN`.
3. Run:
   ```bash
   node --env-file=.env.local scripts/seed.mjs
   ```

## Replacing the hero image

Once Sanity is connected, go to `/studio` → **Site Settings** → upload an
image to **Hero Image** → Publish. It appears on the homepage immediately,
no code changes needed. Until an image is uploaded there, the homepage falls
back to the original placeholder illustration at
`public/images/hero-church.svg`.

## Project structure

```
src/
  app/
    (site)/            # marketing pages, wrapped in Header + Footer
      page.tsx          # homepage: hero + 3 section cards
      departments/      # ministry cards + [slug] detail pages
      services/
      resources/
    studio/[[...tool]]/ # embedded Sanity Studio at /studio
  components/           # Header, Footer, Hero, Card3D, CardGrid
  lib/                  # content fetching + fallback data
  sanity/               # client, schemas, queries, env
```

## Deploying

Deploy to [Vercel](https://vercel.com/new) — set the same environment
variables from `.env.local` in the project's dashboard settings.
