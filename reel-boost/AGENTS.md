# ReelBoost — agent notes

## Commands

```bash
npm run dev          # dev server (http://localhost:3000)
npm run build        # production build  ← run after changes
npm run typecheck    # tsc --noEmit      ← run after changes
npm run test         # vitest run        ← run after changes to src/lib/feed.ts
npm run db:push      # create/migrate SQLite db
npm run db:seed      # seed demo data
npm run db:studio    # prisma studio
```

Always run `npm run typecheck` and `npm run test` after edits. After schema changes
run `npm run db:generate && npm run db:push` then re-seed if needed.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind 4 · Prisma 7 + SQLite
(`@prisma/adapter-better-sqlite3`) · custom credentials auth (bcryptjs + jose JWT cookie)
· simulated wallet (credits) · demo MP4s + optional YouTube Data API.

## Key files

- `src/lib/feed.ts` — the recommendation algorithm (pure, tested). The core product logic.
- `src/lib/feed.test.ts` — vitest tests for the algorithm.
- `src/lib/auth.ts` / `src/lib/session.ts` — auth helpers + JWT cookie.
- `src/middleware.ts` — route protection.
- `prisma/schema.prisma` — data model (User, Video, Boost, Like, View, Category, …).
- `prisma/seed.ts` — demo data (creators with boosts, viewer with preferences/likes).

## Conventions

- Server components by default; client components marked `"use client"` (forms, FeedView).
- Dates cross the RSC boundary as ISO strings (see `src/lib/types.ts`).
- `createMany({ skipDuplicates })` is NOT supported by the SQLite adapter — delete first.
- Adapter export is `PrismaBetterSqlite3` (lowercase "q").
- Demo accounts (seeded): `creator@demo.app` / `viewer@demo.app`, password `demo123`.