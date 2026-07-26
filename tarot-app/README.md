# Arcana — Tarot & Fortune Web App

## Quick Start (Local Development)

### 1. Install dependencies

```bash
cd tarot-app
npm install
```

### 2. Set up environment variables

The `.env` file is already configured for local dev:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret-key-for-local-development-only-1234567890"
```

> **IMPORTANT**: The `JWT_SECRET` must be set. Without it, the app falls back to a
> default secret which may cause issues. If you change it, you must restart the server.

### 3. Set up the database

```bash
# Create the database and apply schema
npx prisma migrate dev

# Seed the database (78 cards, 6 spreads, 10 achievements)
npx prisma db seed
```

### 4. Create a test account

A test account is created automatically if you run this command:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()
async function main() {
  const email = 'test@arcana.app'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Test user already exists:', email)
  } else {
    const hash = await bcrypt.hash('test123', 10)
    await prisma.user.create({
      data: { email, passwordHash: hash, name: 'Tester', coins: 999999, xp: 1000, level: 10, loginStreak: 7 }
    })
    console.log('Test user created:', email, '/ test123')
  }
  await prisma.\$disconnect()
}
main()
"
```

**Test credentials:**

| Email             | Password   | Stardust   |
|-------------------|------------|------------|
| `test@arcana.app` | `test123`  | ✦ 999,999  |

### 5. Start the dev server

```bash
npm run dev
```

### 6. Open the app in your browser

**IMPORTANT:** Use `localhost`, NOT your LAN IP:

```
✅ http://localhost:3000          ← correct
✅ http://127.0.0.1:3000         ← correct
❌ http://192.168.x.x:3000        ← may cause HMR/cookie issues
```

Go to `http://localhost:3000/login` and enter the test credentials.

## How Login Works (flow)

```
1. User enters email + password on /login page
2. Browser sends POST /api/auth/login
3. Server verifies credentials via Prisma + bcryptjs
4. Server signs a JWT (jose library) and sets it in an httpOnly cookie
5. Server returns 200 OK with user data
6. Browser receives Set-Cookie header → stores the token cookie
7. Login page redirects: window.location.href = '/dashboard'
8. Browser navigates to /dashboard (full page load)
9. Middleware checks for valid token cookie → allows access
10. Dashboard page loads, fetches /api/auth/me to get user info
```

## Debugging Login Issues

### Step 1: Check the debug endpoint

Open this URL in your browser (while NOT logged in):

```
http://localhost:3000/api/debug
```

You should see a JSON response like:

```json
{
  "tokenCookiePresent": false,
  "totalUsersInDb": 1,
  "testUserExists": true,
  "testUserInfo": { "id": "...", "name": "Tester", "coins": 999999 }
}
```

If `testUserExists` is `false`, run the test account creation step above.

### Step 2: Check server logs

When you try to login, the **terminal** (where `npm run dev` is running) should show:

```
[LOGIN API] Received login request
[LOGIN API] Email: test@arcana.app | Password length: 7
[LOGIN API] Looking up user in database...
[LOGIN API] User found: cms1taz... | name: Tester
[LOGIN API] Verifying password...
[LOGIN API] Password verified OK
[LOGIN API] Signing JWT token...
[LOGIN API] Token signed, length: 180
[LOGIN API] Cookie set, returning success
[LOGIN API] NODE_ENV: development
[LOGIN API] JWT_SECRET set: true
```

### Step 3: Check browser console

Open DevTools (F12) → Console tab. On the login page, you'll see:

```
[LOGIN PAGE] Submit button pressed
[LOGIN PAGE] Email: test@arcana.app
[LOGIN PAGE] Password length: 7
[LOGIN PAGE] Sending fetch to /api/auth/login...
[LOGIN PAGE] Response status: 200
[LOGIN PAGE] Response ok: true
[LOGIN PAGE] Response data: {"user":{"id":"...","name":"Tester",...}}
[LOGIN PAGE] Login successful! Token cookie should be set.
[LOGIN PAGE] Redirecting to /dashboard via window.location.href...
```

The login page also shows a **debug log panel** on screen during login.

### Step 4: Check if the dashboard loads

After redirect to `/dashboard`, the terminal should show:

```
[MIDDLEWARE] Request: /dashboard
[MIDDLEWARE] isApiAuth: false | isApi: false | isPageProtected: true
[MIDDLEWARE] Token cookie present: true
[MIDDLEWARE] Token verified: true
[MIDDLEWARE] Access granted for: /dashboard
[AUTH ME] Request received
[AUTH ME] Token cookie present: true
[AUTH ME] User authenticated: cms1taz... | test@arcana.app
[DASHBOARD] Page mounted, fetching user data...
[DASHBOARD] /api/auth/me status: 200
[DASHBOARD] User data: Tester (test@arcana.app)
[DASHBOARD] /api/daily/card status: 200
```

### Common issues

#### "Invalid email or password" error on login

- **Cause**: Wrong credentials or test user not created.
- **Fix**: Run the test account creation command above. Then verify with `http://localhost:3000/api/debug`.

#### Login succeeds but dashboard doesn't load (redirects back to /login)

- **Cause 1**: Accessing via LAN IP (`192.168.x.x`) instead of `localhost` — cookies may not be sent properly.
- **Fix**: Use `http://localhost:3000`.
- **Cause 2**: `JWT_SECRET` not set in `.env`.
- **Fix**: Add `JWT_SECRET="any-string-here"` to `.env` and restart.
- **Cause 3**: Browser blocking third-party cookies.
- **Fix**: Check browser cookie settings, allow cookies for localhost.

#### "Cannot read properties of undefined (reading 'useCache')" console error

- **Cause**: This is from a **browser extension** (like React DevTools), NOT from the app. The `content.js` and `polyfill.js` filenames in the error trace are from Chrome extensions, not Next.js.
- **Fix**: Open the app in an **incognito/private window** with extensions disabled, or disable React DevTools temporarily. The app works fine — this error is cosmetic.

#### Database not found / Prisma errors

- **Cause**: Migration not run or database not seeded.
- **Fix**:
  ```bash
  npx prisma migrate dev
  npx prisma db seed
  ```

#### HMR WebSocket connection failed

- **Cause**: Accessing via LAN IP (`http://192.168.x.x:3000`).
- **Fix**: Use `http://localhost:3000`. HMR only works on localhost.

## Build for production

```bash
npm run build    # TypeScript check + production build
npm start        # Start production server on port 3000
```

## Project structure

```
src/
  app/
    api/           REST API routes (auth, readings, cards, shop, etc.)
    login/         Login page
    register/      Registration page
    dashboard/     Main dashboard (protected)
    read/          Reading wizard + history detail
    history/       Reading history list
    fortune/       Fortune hub (horoscope, moon, 8-ball, etc.)
    shop/          Unlock decks/spreads/features
    collection/    Browse all 78 cards
    profile/       User profile + achievements
  components/      React components (Navbar)
  lib/             Server utilities (db, auth, rng, coins, fortune)
  data/            Static data (horoscopes, fortune cookies)
  middleware.ts    Route protection (JWT cookie check)
prisma/
  schema.prisma    Database schema
  seed.ts          Seed data (78 cards, 6 spreads, 10 achievements)
```

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Prisma 6 + SQLite (dev) / Postgres (prod)
- Custom JWT auth (`jose` + `bcryptjs`, httpOnly cookies)
- Zustand (client state)