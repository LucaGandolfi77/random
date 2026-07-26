# Arcana — Tarot & Fortune Web App: Implementation Specification

> Self-contained prompt for the implementing AI model. Build the entire full-stack application following this document in milestone order (section 11). Every specification below is mandatory unless marked as optional.

---

## 1. Overview

Build a **full-stack web app** for tarot card readings and fortune-telling, deployed as a single Next.js project:

- **User accounts**: register, login, persistent profiles with XP, levels, virtual currency ("Stardust"), achievements, login streaks.
- **Tarot readings**: the full 78-card Rider-Waite-Smith deck (public domain), multiple spreads (some locked behind unlocks), optional reversed cards, curated static interpretations (no external APIs).
- **Reading history**: saved per user with question, spread, cards drawn, date; view, delete, stats.
- **Unlock system**: spend Stardust earned through use to unlock new decks, spreads, and divination modes.
- **Fortune hub**: daily horoscope, daily card, fortune cookie, Magic 8-Ball, lucky numbers, moon phase, numerology (life path), zodiac compatibility, rune casting (unlockable), biorhythm (unlockable).

No real payments, no external APIs at runtime, all interpretations are curated static text. UI in English.

---

## 2. Tech Stack (mandatory)

| Area | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript (strict) | Single project: frontend + API routes, deployable as one unit (Vercel) |
| Styling | Tailwind CSS | Rapid development, dark "mystic" theme |
| Database + ORM | Prisma + SQLite (dev) / PostgreSQL (prod) | Zero-config dev; exact migration path documented in README |
| Auth | Custom JWT: `jose` + `bcryptjs`, httpOnly cookie, middleware | Explicit, auditable, no external provider dependencies |
| Client state | Zustand | Session/cache state |
| Animations | Framer Motion | Card shuffle, flip, reveal, cookie crack, 8-ball shake |
| Card images | RWS public-domain scans in `public/cards/*.jpg` | Authentic free art; download script provided |

### Key Dependencies

```
next@14, react@18, react-dom@18, typescript@5 (strict)
tailwindcss, postcss, autoprefixer
prisma, @prisma/client
jose, bcryptjs
zustand
framer-motion
zod (validation)
```

---

## 3. Project Structure

```
tarot-app/
  .env.example
  .gitignore
  README.md
  package.json
  tsconfig.json
  tailwind.config.ts
  next.config.js
  postcss.config.js

  scripts/
    download-cards.ts              # downloads 78 RWS images into public/cards/

  prisma/
    schema.prisma
    seed.ts                        # cards, decks, spreads, achievements, fortune texts

  public/
    cards/                         # 78 images named: major-00-fool.jpg ... pentacles-13.jpg
      .gitkeep

  src/
    lib/
      db.ts                        # Prisma client singleton
      auth.ts                      # jwt sign/verify, hash/compare password, getUser(req)
      rng.ts                       # seeded PRNG (mulberry32 from hash(userId+date))
      coins.ts                     # reward/level/unlock helpers (server-only)
      fortune/
        moonPhase.ts               # compute moon phase from date
        numerology.ts              # life path number
        compatibility.ts           # zodiac compatibility matrix
        biorhythm.ts               # sine curves from birthdate
    data/
      cardMeanings.ts              # 78 cards: name, uprightMeaning, reversedMeaning, keywords
      spreads.ts                   # spread definitions with position layouts
      horoscopes.ts                # 12 signs × (love/career/health) text pools
      fortunes.ts                  # fortune cookie messages + 8-ball answers
      runes.ts                     # 24 Elder Futhark runes with meanings
      achievements.ts              # achievement definitions and trigger logic

    middleware.ts                  # route protection (redirect if no valid JWT)

    app/
      page.tsx                     # landing page (marketing, CTA)
      layout.tsx                   # root layout (fonts, metadata, providers)

      login/page.tsx
      register/page.tsx

      dashboard/page.tsx           # daily card, streak, coins, quick actions
      read/new/page.tsx            # reading wizard (deck→spread→question→draw→reveal→save)
      read/[id]/page.tsx           # saved reading detail
      history/page.tsx             # paginated list, delete
      collection/page.tsx          # card gallery with filters and meanings
      shop/page.tsx                # unlock new decks/spreads/modes
      fortune/page.tsx             # hub with all fortune widgets
      profile/page.tsx             # stats, achievements, edit

      api/
        auth/register/route.ts
        auth/login/route.ts
        auth/logout/route.ts
        auth/me/route.ts

        cards/route.ts
        decks/route.ts
        spreads/route.ts

        readings/route.ts          # POST (create) + GET (list, paginated)
        readings/[id]/route.ts     # GET (detail) + DELETE

        shop/unlock/route.ts

        user/stats/route.ts
        user/achievements/route.ts

        daily/card/route.ts

        horoscope/[sign]/route.ts

    components/
      Navbar.tsx
      CardFace.tsx                 # renders one card (image + name overlay)
      CardBack.tsx                 # card back per deck theme
      SpreadBoard.tsx              # positions + card-drop zones
      ReadingWizardSteps.tsx
      ReadingInterpretation.tsx
      ReadingCard.tsx              # history list item
      FortuneWidget.tsx            # wrapper for fortune widgets
      AchievementBadge.tsx
      LoadingSpinner.tsx
```

---

## 4. Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  birthdate     DateTime?
  zodiacSign    String?
  coins         Int      @default(100)
  xp            Int      @default(0)
  level         Int      @default(1)
  loginStreak   Int      @default(0)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())

  readings         Reading[]
  unlocks          Unlock[]
  userAchievements UserAchievement[]
  dailyActivities  DailyActivity[]
}

model Deck {
  id         String  @id @default(cuid())
  slug       String  @unique
  name       String
  description String
  cost       Int     @default(0)
  isDefault  Boolean @default(false)
  themeJson  String  @default("{}")       // { cardBack: "#...", frameColor: "#...", nameColor: "..." }
  sortOrder  Int

  cards     Card[]
  readings  Reading[]
}

model Card {
  id               String  @id @default(cuid())
  deckId           String
  name             String                                    // "The Fool", "Ace of Wands"
  arcana           String                                    // "major" | "minor"
  suit             String?                                   // "wands" | "cups" | "swords" | "pentacles" | null for major
  rank             String?                                   // "ace", "2".."10", "page", "knight", "queen", "king"
  uprightMeaning   String                                    // full text paragraph
  reversedMeaning  String                                    // full text paragraph
  keywords         String                                    // comma-separated
  imagePath        String
  sortOrder        Int

  deck      Deck      @relation(fields: [deckId], references: [id])
  readings  Reading[] // via ReadingCard (see below)
}

model Spread {
  id             String  @id @default(cuid())
  slug           String  @unique
  name           String
  description    String
  positionsJson  String  // JSON: [{ key: "past", label: "Past", x: 0.2, y: 0.5, cardCount: 1 }]
  cardCount      Int     @default(1)
  cost           Int     @default(0)
  isDefault      Boolean @default(false)
  sortOrder      Int

  readings  Reading[]
}

model Reading {
  id         String   @id @default(cuid())
  userId     String
  spreadId   String
  deckId     String
  question   String?
  cardsJson  String   // JSON: [{ cardId: "ck...", positionKey: "past", reversed: false }]
  notes      String?
  createdAt  DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  spread Spread @relation(fields: [spreadId], references: [id])
  deck   Deck   @relation(fields: [deckId], references: [id])
}

model Unlock {
  id        String   @id @default(cuid())
  userId    String
  itemType  String   // "deck" | "spread" | "feature"
  itemSlug  String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, itemType, itemSlug])
}

model Achievement {
  id           String @id @default(cuid())
  slug         String @unique
  name         String
  description  String
  coinsReward  Int    @default(0)
  xpReward     Int    @default(0)

  userAchievements UserAchievement[]
}

model UserAchievement {
  userId        String
  achievementId String
  earnedAt      DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id])
  achievement Achievement @relation(fields: [achievementId], references: [id])

  @@id([userId, achievementId])
}

model DailyActivity {
  id        String   @id @default(cuid())
  userId    String
  date      String   // "YYYY-MM-DD"
  type      String   // "login" | "dailyCard" | "reading"
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, date, type])
}
```

---

## 5. Seed Data

Write a comprehensive `prisma/seed.ts` that populates:

### 5.1 Cards (78 entries)

All 78 Rider-Waite-Smith cards with curated upright and reversed meanings (3-5 sentences each, no lorem ipsum) and 3-6 comma-separated keywords per card. Image path format: `major-{number}.jpg` (00 The Fool → 21 The World) and `{suit}-{rank}.jpg` (e.g. `wands-ace.jpg`, `cups-10.jpg`, `swords-page.jpg`, `pentacles-king.jpg`). Sort order: 0–77 (Major Arcana 0–21, then Wands Ace→King, Cups Ace→King, Swords Ace→King, Pentacles Ace→King).

Only the RWS deck is seeded; it is the default (`isDefault: true`, `cost: 0`). The "Marseille" and "Shadow" decks are not seeded — they are treated as re-skins with the same 78 image paths but different `themeJson` (custom CSS colors for card back, frame, and name text). They are created at seed time but marked `isDefault: false, cost: 500` (Marseille) and `cost: 800` (Shadow).

### 5.2 Spreads

| slug | name | cardCount | positions | cost |
|---|---|---|---|---|
| `single` | Single Card | 1 | `[{ key: "single", label: "Card", x:0.5, y:0.5 }]` | 0 |
| `three-card` | Past / Present / Future | 3 | `[{ key: "past", label: "Past", x:0.15, y:0.5 }, { key: "present", label: "Present", x:0.5, y:0.5 }, { key: "future", label: "Future", x:0.85, y:0.5 }]` | 0 |
| `celtic-cross` | Celtic Cross | 10 | standard layout with 10 positions (1 center covering, 2 crossing, 3 below, 4 behind, 5 above, 6 ahead, 7–10 right column) | 300 |
| `horseshoe` | Horseshoe | 7 | 7 positions in an arc: past, present, hidden influences, obstacles, external influences, hopes/fears, outcome | 250 |
| `love` | Love Spread | 5 | you, partner, strengths, challenges, outcome | 250 |
| `yes-no` | Yes / No | 1 | single card, interpretation depends on card + suit + reversal | 150 |

### 5.3 Achievements

| slug | name | condition | coins | xp |
|---|---|---|---|---|
| `first-reading` | First Steps | complete 1 reading | 15 | 20 |
| `ten-readings` | Seeker | complete 10 readings | 30 | 50 |
| `fifty-readings` | Oracle | complete 50 readings | 75 | 150 |
| `streak-3` | Three-Day Journey | login streak ≥ 3 | 10 | 15 |
| `streak-7` | Aligned Week | login streak ≥ 7 | 25 | 50 |
| `streak-30` | Moon Cycle | login streak ≥ 30 | 100 | 200 |
| `first-celtic` | Deep Dive | complete a Celtic Cross reading | 25 | 40 |
| `first-unlock` | Collector | unlock your first item | 0 | 30 |
| `major-collector` | Arcane Master | draw all 22 Major Arcana at least once across readings | 50 | 100 |
| `fortune-explorer` | Fortune Seeker | use 5 different fortune tools | 30 | 50 |
| `all-tools` | All-Seeing | use all fortune tools (including unlocked ones) | 100 | 200 |

### 5.4 Fortune Text Pools

- **Horoscopes**: 12 signs × 3 categories (love, career, health) × 10 variations each = 360 text entries. Deterministically picked by `seededIndex(sign + category + date)`.
- **Fortune cookies**: 50 short messages.
- **8-Ball**: 20 classic answers (yes, no, ask again later...).
- **Runes**: 24 Elder Futhark runes with name, symbol (Unicode character), meaning paragraph. Only usable after unlocking via shop (`itemType: "feature", itemSlug: "runes"`).
- **Numerology**: meanings for life path numbers 1–9, 11, 22.

---

## 6. Auth Specification

### 6.1 Implementation

- **`lib/auth.ts`**:
  - `hashPassword(plain: string): Promise<string>` — bcryptjs with 10 rounds.
  - `verifyPassword(plain, hash): Promise<boolean>`.
  - `signToken(payload): Promise<string>` — `jose` JWT, algorithm `HS256`, expires in `7d`, payload: `{ userId, email }`.
  - `verifyToken(token): Promise<payload | null>` — returns null on expiry/invalid.
  - `getUser(req: NextRequest): Promise<User | null>` — reads `token` cookie from `req.cookies`, verifies, queries DB for user.
- **`middleware.ts`**: applies to `/dashboard`, `/read`, `/history`, `/shop`, `/profile`, `/fortune`, `/collection`, `/api/*` (except `/api/auth/*`). Redirects to `/login` (pages) or returns 401 (API routes) when no valid token.
- **Cookies**: `token`, httpOnly, sameSite: lax, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 24 * 60 * 60.

### 6.2 Endpoints

- **`POST /api/auth/register`** — body: `{ email, password, name, birthdate? }`. Validate (zod schema: email format, password min 6 chars, name required). If email taken → 409. On success: create user, auto-derive `zodiacSign` from birthdate (server-side calculation), set cookie, return `{ user: { id, name, email, coins, xp, level } }`.
- **`POST /api/auth/login`** — body: `{ email, password }`. Verify, set cookie, return user. Invalid → 401.
- **`POST /api/auth/logout`** — clear cookie.
- **`GET /api/auth/me`** — return current user (id, name, email, coins, xp, level, loginStreak, zodiacSign) or 401.

### 6.3 Zodiac Sign Derivation

```typescript
function getZodiacSign(date: Date): string {
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini'
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
  return 'pisces'
}
```

---

## 7. Reading Engine

### 7.1 Draw Logic

- Use `crypto.getRandomValues` via server (API route) for unbiased shuffle.
- **Fisher-Yates shuffle** on the 78-card deck, draw `spread.cardCount` cards from the front.
- For each drawn card, determine `reversed: Math.random() < 0.3` (toggleable by user — if reversed is disabled, always `false`).
- Duplicate prevention: the same card cannot appear twice in one reading.

### 7.2 Wizard Flow (`/read/new`)

Single-page wizard with steps controlled by Zustand:

1. **Deck Selection** — show unlocked decks as clickable cards (name + visual theme). Default selected.
2. **Spread Selection** — show unlocked spreads as grid cards (name + cardCount + cost indicator if not yet owned). Default selected.
3. **Question** — textarea (optional, placeholder: "What is on your mind?"), max 500 chars.
4. **Shuffle Animation** — animated card fan shuffles for 2 seconds; after animation, cards appear face-down in a horizontal fan.
5. **Pick Cards** — user clicks on face-down cards in the fan one at a time (up to spread.cardCount). Each click triggers a flip animation (Framer Motion `rotateY` 0→180).
6. **Reveal** — all selected cards are displayed in the spread layout (SpreadBoard organizes positions as rectangles on a board). Each card shows its image, position label, and "Reversed" badge if applicable.
7. **Interpretation** — below the spread, for each position show: `position label` + `card name ("Reversed")` + `meaning text (upright or reversed)` + `keywords`. A synthesized summary paragraph at the bottom.
8. **Save / Discard** — button "Save Reading" → `POST /api/readings` → receive rewards (toast: "+10 Stardust, +15 XP") → navigate to `/read/[id]`. "Discard" → back to `/dashboard` without saving.

### 7.3 Save Reading

**`POST /api/readings`** — body: `{ spreadId, deckId, question, cardsJson [{cardId, positionKey, reversed}] }`.

Server validates:
- User owns this spread and deck (or they are default/free).
- `cardsJson.length === spread.cardCount`.
- No duplicate `cardId` values.

On success:
- Create `Reading` record.
- Award coins (+10, ×1.5 for spreads with cardCount ≥ 7), XP (+15 ×1.5 for cardCount ≥ 7).
- Update user coins, XP. Recompute level: `Math.floor(Math.sqrt(xp / 100)) + 1`.
- Record `DailyActivity` of type `reading` for today (idempotent — only first reading today counts for the achievement).
- Check and grant achievements (see section 9.3).
- Return `{ reading, coinsAwarded, xpAwarded, newAchievements? }`.

### 7.4 History

- **`GET /api/readings`** — paginated list (cursor or offset, 20 per page). Returns `{ readings: [...], nextCursor? }`. Each item: id, spread name, deck name, question (truncated), date, cardCount.
- **`GET /api/readings/[id]`** — full detail including parsed `cardsJson`, full question, spread layout, notes.
- **`DELETE /api/readings/[id]`** — soft? No, hard delete. Verify ownership. No coin/XP penalty.

---

## 8. Progression & Shop

### 8.1 Earning Currency

| Action | Stardust | XP |
|---|---|---|
| Daily login (first visit of day) | 5 | 0 |
| Daily login streak bonus (per day of streak, max +15) | +1/day | 0 |
| Check daily card | 3 | 0 |
| Complete a reading | 10 | 15 |
| Complete a reading with ≥7 cards | 15 | 25 |
| Achievement granted | per achievement | per achievement |

### 8.2 Shop (`/shop`)

Grid cards for each lockable item:
- Decks (Marseille: 500, Shadow: 800)
- Spreads (celtic-cross: 300, horseshoe: 250, love: 250, yes-no: 150)
- Features (runes: 800, biorhythm: 300)

Each card shows: name, description, cost, owned/locked badge, "Unlock" button (disabled if insufficient coins or already owned).

**`POST /api/shop/unlock`** — body: `{ itemType: "deck"|"spread"|"feature", itemSlug: string }`.

Server-side (Prisma transaction):
1. Verify item exists and has a cost > 0.
2. Verify `!await Unlock.findUnique({ where: { userId_itemType_itemSlug } })` (not already owned).
3. Verify `user.coins >= cost`.
4. Deduct coins, create Unlock record.
5. Return `{ coins: newBalance }`.

Client shows remaining coins + toast. The UI must immediately reflect unlocked status (refetch or optimistic update).

### 8.3 Login Streak

Tracked via `DailyActivity` of type `login`. On each login request (`GET /api/auth/me`):
- Get the most recent `login` activity date.
- If most recent < today: compute streak. If yesterday → increment streak; else → reset to 1.
- Record today's login activity (idempotent).
- Award streak-dependent coins.

---

## 9. Fortune Hub (`/fortune`)

All fortune widgets in a responsive grid. Some are gated by `Unlock` records.

### 9.1 Daily Card

Deterministic: `seededPicker(user.id, date, deckIds)` returns one card + orientation. Rendered as a single faced-up card. Button to view interpretation in modal. Grants +3 coins once per day (checked via DailyActivity of type `dailyCard`).

### 9.2 Daily Horoscope

Select your sign → shows love, career, health readings for today. Texts picked deterministically by `hash(sign + category + date) % poolLength`. The user's saved zodiacSign is auto-selected if birthdate was provided at registration.

### 9.3 Fortune Cookie

Click a cookie → crack animation (Framer Motion: split + reveal) → shows random message from `fortunes.ts` cookie pool (seeded by `hash(userId + date)` for same-message-all-day, or pure random for each click — use pure random for unlimited reads).

### 9.4 Magic 8-Ball

Type a question → shake animation on the 8-ball (CSS/Framer Motion wiggle) → one of 20 classic answers appears. Purely client-side; no server call needed.

### 9.5 Lucky Numbers

Generated deterministically from `hash(userId + date)`: 6 numbers 1–49 (no duplicates) with a short numerological meaning sentence ("The number 7 appears twice — a sign of spiritual alignment").

### 9.6 Moon Phase

Compute from today's date using lunar cycle (synodic period 29.53059 days, reference new moon 2000-01-06). Show 8 phase names (New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Third Quarter, Waning Crescent) with an icon/SVG and a brief meaning.

### 9.7 Numerology (Life Path)

User enters birthdate → compute life path number (reduce sum of digits until single digit, keep 11/22). Show meaning from `numerology.ts` pool. If user has birthdate saved, auto-fill.

### 9.8 Compatibility

Pick two zodiac signs → show compatibility score (templated per element pairing: same element = good, complementary = great, opposing = challenging) with a 1–2 sentence description. 12×12 matrix pre-defined.

### 9.9 Rune Casting (unlockable)

Gated by `Unlock` where `itemType: "feature", itemSlug: "runes"`. If not unlocked, show a shop card overlay.

Draw 1 or 3 runes from 24 Elder Futhark. Each rune shows: name, symbol, meaning paragraph. Layout similar to a small reading — can be saved as a "reading" with `spreadId` pointing to a special rune spread (not a card spread; handle via `itemType: "feature"` logic or create a dedicated table). Simplified approach: save as a Reading with `spreadId` = null, a custom `cardsJson` storing rune data, and a special marker. Or keep it client-side only (no save, just view). **Implementation choice**: client-side only for runes; no server save required.

### 9.10 Biorhythm (unlockable)

Gated like runes. Enter birthdate → render three sine curves (physical: 23-day, emotional: 28-day, intellectual: 33-day) for the next 30 days on a small canvas or SVG. Formula: `sin(2π × daysSinceBirth / period)`.

---

## 10. UI / UX

### 10.1 Theme

- Dark mystic theme: background `#0a0a1a` (deep navy), surfaces `#13132b` (dark indigo), accent `#d4a843` (gold), text `#e8e0d0` (warm white), secondary text `#8a7e6e`.
- Fonts: Cormorant Garamond (headings), Inter (body). Google Fonts via next/font.
- Tailwind config extends colors: `mystic-dark`, `mystic-surface`, `mystic-gold`, `mystic-text`, `mystic-muted`.

### 10.2 Layout

- Global Navbar at top: logo (stylized "Arcana") + coins badge + navigation links.
- Responsive: sidebar on desktop (≥1024px) collapses to hamburger mobile menu.
- Page wrapper: max-width 1200px, centered.
- Cards in reading views have fixed 2:3 aspect ratio, max-width 160px, `box-shadow` with glow on hover.
- Toast notifications for rewards, unlocks, errors (bottom-right, auto-dismiss 4s).

### 10.3 Component Notes

- **`CardFace.tsx`**: receives card object + orientation (`upright` | `reversed`). Renders `<Image>` (or `<div>` placeholder if image missing) with `rotate(180deg)` for reversed. Overlays card name at bottom.
- **`CardBack.tsx`**: receives deck theme (color from `themeJson`). Styled div with a decorative pattern (CSS star/circle pattern or cross-hatch).
- **`SpreadBoard.tsx`**: renders position zones from spread `positionsJson` (x/y as fractions of board width/height). Each zone is a drop-target-like rectangle with position label. Cards placed inside after reveal.
- **`ReadingWizardSteps.tsx`**: manages step state, transitions between deck/spread/question/draw/reveal/save with Framer Motion `AnimatePresence`.

### 10.4 States

Every page/component must handle: **loading** (skeleton/spinner), **empty** (illustration + message), **error** (message + retry button), and **success**.

---

## 11. Milestones (mandatory order)

1. **Scaffold**: Next.js + TypeScript + Tailwind + Prisma schema + `lib/db.ts`. Run `prisma migrate dev` and `prisma db seed`. Create `scripts/download-cards.ts` that fetches 78 RWS images from Wikimedia Commons. Generate `public/cards/` folder. Verify `npm run build` passes.
2. **Auth**: `lib/auth.ts`, middleware, register/login/logout/me pages and API routes. Zustand session store. Navbar with login/logout/coins display.
3. **Dashboard**: layout shell, daily card widget (deterministic), streak widget, quick actions (New Reading, Fortune, History cards). Daily activity recording.
4. **Reading Engine + Wizard**: `lib/rng.ts`, draw logic, `/read/new` page with all wizard steps + animations. Save via API.
5. **History**: `/history` list with pagination, `/read/[id]` detail page, delete action.
6. **Shop + Unlocks**: `/shop` page, API unlock endpoint, locked/unlocked states across UI (deck selection filters out locked, spread selection filters out locked, fortune hub gates widgets).
7. **Fortune Hub**: All widgets (daily card, horoscope, cookie, 8-ball, lucky numbers, moon, numerology, compatibility). Runes and biorhythm gated by unlocks. Runes client-side only.
8. **Collection**: `/collection` grid of all 78 cards, filter by arcana/suit, click → modal with full upright + reversed meanings.
9. **Profile**: `/profile` with stats, achievements gallery, edit name/birthdate.
10. **Polish**: error boundaries, loading states everywhere, mobile responsive, SEO meta tags, README (setup, env, seed, deploy to Vercel + Postgres).

---

## 12. Acceptance Criteria

- [ ] Register with email+password → logged in → protected pages accessible; logout → redirected to landing.
- [ ] Login streak increments correctly across consecutive days, resets on gap.
- [ ] Complete a Three-Card reading with a question; interpretation shows position labels + card names + correct meanings (reversed when drawn reversed) + keywords. Save grants coins and XP exactly once.
- [ ] History page shows the saved reading; detail page matches; delete removes it.
- [ ] A locked spread shows cost and cannot be selected. Unlock it → coins deducted → can now select and use.
- [ ] Attempting unlock with insufficient coins returns error (no DB mutation). Unlock idempotent (re-request returns success without double-spend).
- [ ] Daily card is the same on repeated visits today, different between users, changes tomorrow. +3 coins only once per day.
- [ ] All fortune widgets render without JS errors. Runes show "locked" overlay until purchased.
- [ ] `npm run build` with zero TypeScript errors. `npx prisma migrate dev` + `npx prisma db seed` complete without errors on a fresh clone.
- [ ] All 78 cards have full upright + reversed meanings (no placeholder text). All spreads have correct `positionsJson`.

---

## 13. Pitfalls & Constraints

- **Prisma singleton**: `lib/db.ts` must `globalThis.prisma ||= new PrismaClient()` to survive Next.js hot-reload.
- **Server-only coins**: NEVER trust `user.coins` from client. All coin/XP mutations happen server-side in transactions.
- **Seeded randomness**: Implement a deterministic PRNG in `lib/rng.ts`:
  ```typescript
  function hashStr(s: string): number { /* simple FNV-1a or use crypto.subtle.digest */ }
  export function mulberry32(seed: number): () => number { /* classic mulberry32 */ }
  export function seededPicker<T>(arr: T[], seed: string): T { /* hash + mulberry32 */ }
  ```
  Used for daily card, daily horoscope, lucky numbers.
- **Image availability**: If `public/cards/{slug}.jpg` is missing, render a CSS placeholder with card name + keywords. Never crash.
- **Framer Motion**: Use `layoutId` for shared-element transitions on cards. `AnimatePresence` with `mode="wait"` for wizard steps. Use `rotateY` for card flips with `backfaceVisibility: "hidden"`.
- **Mobile**: The card fan on `/read/new` should collapse to a grid on small screens; spread layout reflows vertically.
- **Security**: JWT secret in `.env` (committed `.env.example` without real secret). Password hashed with bcryptjs (10 rounds). No SQL injection (Prisma). Rate-limit not required for MVP but note in README as future improvement.

---

## 14. Deliverable

A complete repository at the end of implementation:

- All source code as specified.
- `prisma/seed.ts` with complete data (no lorem ipsum).
- `scripts/download-cards.ts` that downloads and places 78 card images.
- `public/cards/` populated after running the download script.
- `README.md` containing:
  ```
  # Arcana — Tarot & Fortune Web App
  
  ## Quick Start
  npm install
  cp .env.example .env   # set JWT_SECRET to a random string
  npx prisma migrate dev
  npx prisma db seed
  npm run download-cards # optional — fallback placeholders without images
  npm run dev
  
  ## Deploy (Vercel + Postgres)
  1. Push to GitHub
  2. Import in Vercel
  3. Set DATABASE_URL to a Postgres connection string (Neon, Supabase, etc.)
  4. Set JWT_SECRET
  5. Deploy
  6. Run 'npx prisma migrate deploy' and 'npx prisma db seed' via Vercel CLI or a one-off cron
  ```
- `.env.example` with `JWT_SECRET=` and `DATABASE_URL="file:./dev.db"`.
- Deployed URL (optional, post-implementation).

---

## Implementation Order Tips

- Start with **Prisma schema + seed** (milestone 1). Everything else depends on the DB being queryable.
- Auth (milestone 2) is the next dependency — you cannot test protected features without login.
- The reading engine (milestone 4) is the core feature; implement it as a pure function first, then wrap it in the wizard UI.
- Fortune widgets (milestone 7) are mostly client-side pure functions; easy to parallelize once the layout exists.
- Shop and unlocks (milestone 6) touch most UI pages; implement early enough that locked states are tested alongside each feature.
