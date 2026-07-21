# REELTV

> Buy airtime. Broadcast your Reel. Reach millions.

A premium SaaS platform combining YouTube, TikTok, Twitch, and TV Channels. Users buy broadcasting time for their Reels on topic-dedicated channels.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui, Motion
- **Database:** PostgreSQL (Prisma ORM, pgvector)
- **Cache:** Redis
- **Auth:** Clerk
- **Payments:** Stripe
- **Storage:** UploadThing + Cloudflare R2
- **AI:** OpenAI (moderation, embeddings, metadata)
- **Email:** Resend
- **Monitoring:** Sentry, Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (with pgvector extension)
- Redis 7+

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd reel-tv

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys

# Start database
docker-compose.dev.yml up -d

# Run migrations
npx prisma db push

# Seed database
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (Clerk)
│   ├── (dashboard)/        # Dashboard pages
│   ├── (marketing)/        # Marketing pages
│   ├── api/                # API routes
│   ├── channel/            # Channel pages
│   ├── upload/             # Upload page
│   ├── search/             # Search page
│   └── watch/              # Video watch page
├── components/             # React components
│   ├── ui/                 # shadcn/ui
│   ├── layout/             # Layout components
│   ├── home/               # Home page components
│   ├── channel/            # Channel components
│   ├── video/              # Video components
│   ├── dashboard/          # Dashboard components
│   └── search/             # Search components
├── lib/                    # Utilities & config
├── features/               # Business logic
├── server/                 # Server-side code
└── types/                  # TypeScript types
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Docker

```bash
# Development
docker-compose.dev.yml up -d

# Production
docker-compose up -d
```

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy

### Docker

```bash
docker-compose up -d
```

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
