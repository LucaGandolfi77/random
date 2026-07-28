# 🚀 ReelBoost — *pay to be famous*

A TikTok-style social network where **creators pay (simulated credits) to boost their
reels** so free viewers see them — and where the feed blends **"who paid the most"**
with a small **content-based recommendation algorithm** ("reel più simili a quelli
likati").

> Italian brief: social network in cui si guardano reel/shorts/tiktok via API; gli
> utenti paganti pagano per far vedere i propri reel e divenire famosi; gli utenti
> free vedono i video proposti in base a chi ha pagato di più; scelta categorie;
> piccolo algoritmo che propone reel simili a quelli piaciuti.

## How it works

- **Creators** publish reels (direct MP4 URL or a YouTube link) and choose a category.
- **Creators** spend 💰 credits to **boost** a reel. The more credits, the higher it ranks.
- **Free viewers** scroll a vertical TikTok-style feed. Each slot is ranked by a score:
  ```
  score = 1.0·boostNorm + 0.7·categoryAffinity + 0.5·similarityToLiked
        + 0.3·engagement + 0.2·freshness + 0.05·noise
  ```
  - `boostNorm` — normalized total boost paid (log scale) → *"chi ha pagato di più"*
  - `categoryAffinity` — built from chosen categories + liked videos
  - `similarityToLiked` — same category/author as reels you liked → *"reel simili a quelli likati"*
  - `engagement`, `freshness`, `noise` — secondary signals
- A guaranteed share of top slots is reserved for the highest-boosted "🔥 Boosted" videos.
- Viewers pick **categories** during onboarding and **like** videos, which tunes the feed.

The recommendation engine is a set of pure, tested functions in
[`src/lib/feed.ts`](src/lib/feed.ts) — see `src/lib/feed.test.ts`.

## Tech stack

- **Next.js 15** (App Router, Turbopack) · React 19 · Tailwind CSS 4
- **Prisma 7 + SQLite** (`@prisma/adapter-better-sqlite3`) — zero external services
- **Custom auth** (email/password, bcryptjs, signed JWT cookie via `jose`, middleware)
- **Simulated wallet** (credits, transactions) — no Stripe / no real money
- **Videos** — demo MP4s (Google sample videos) + optional YouTube Data API for Shorts import

## Quick start

```bash
npm install
npm run db:push     # create SQLite db
npm run db:seed     # seed demo content
npm run dev         # http://localhost:3000
```

### Demo accounts (seeded)

| Role    | Email              | Password |
|---------|--------------------|----------|
| Creator | creator@demo.app   | demo123  |
| Creator | vito@demo.app      | demo123  |
| Viewer  | viewer@demo.app    | demo123  |

`creator@demo.app` ("voltatila") has already spent big boosts — you'll see their reels
dominate the feed. `viewer@demo.app` prefers Gaming & Comedy, so the recommendation
algorithm surfaces those higher despite lower boosts.

## Optional: YouTube Shorts search

YouTube videos are embedded by URL without any key. To additionally **search** Shorts by
category for import, set a YouTube Data API v3 key:

```
# .env
YOUTUBE_API_KEY=AIza…
```

Then `GET /api/youtube/search?q=gaming` returns embeddable shorts.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest unit tests (the feed algorithm)
npm run db:seed    # seed demo data
npm run db:push    # push schema to SQLite
npm run db:studio  # prisma studio
```

## Project structure

```
src/
├─ app/
│  ├─ page.tsx              # vertical TikTok-style feed (home)
│  ├─ login/ register/      # auth
│  ├─ onboarding/           # category picker
│  ├─ upload/               # publish a reel
│  ├─ wallet/               # top-up credits + transactions
│  ├─ dashboard/            # creator stats + boost button
│  └─ api/                  # feed, videos, likes, views, wallet, boost, auth, youtube, …
├─ components/              # Header, FeedView, client forms, LogoutButton
├─ lib/
│  ├─ feed.ts               # ★ the recommendation algorithm (pure)
│  ├─ feed.test.ts          # ★ vitest tests
│  ├─ auth.ts session.ts   # credentials auth + JWT cookie
│  └─ prisma.ts utils.ts types.ts
└─ middleware.ts            # route protection
prisma/
├─ schema.prisma
└─ seed.ts
```

## Roadmap ideas

- Image/AI embeddings for visual similarity (pgvector-style) instead of category/author only
- Comment threads, follow graph, "for you" cold-start
- Real Stripe payments
- Real video upload/storage (Cloudflare R2 / UploadThing)

## License

MIT