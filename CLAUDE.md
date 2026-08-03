# Pick Up — Context for Claude

A lean web app for finding and joining local **pickup sports games**. The whole
point is solving the "nobody shows up" problem, so the app is built around a
**show-up loop** (commit → confirm → check in → waitlist), not scores or ranking.

This file is the source of truth for how the app is put together. Read it before
making changes.

---

## Product scope (deliberately small)

**In:**
- Four sports only: **basketball, soccer, baseball, flag football (5v5)**.
- Create a game, browse nearby games, join / leave, see if a game is full.
- **Skill level** per game: `casual`, `intermediate`, `competitive`, `all`.
- **Minimum age** per game: `0` (all ages), or `18` / `35` / `45` (or custom).
- **Lobby chat** (realtime).
- **Show-up system:** join → (reminder) → confirm → check-in, with a **waitlist**
  that auto-promotes the next person when a spot opens.
- **Teams (optional, per game):** the host toggles it on. When on, players pick
  their own side (`a` / `b`) or the host shuffles the active roster into two even
  random sides. Turning it off clears every assignment. Team colors are the blue
  and red from the logo bar.
- **Web Push** reminders ("still coming?"). SMS is intentionally *not* built yet
  but the notification layer is channel-agnostic so it can be added later.

**Cut on purpose (do not re-add without being asked):** leaderboards, leagues,
money games / entry fees / pots, win-loss scores, game history/results,
friends & friend requests, "find similar friends", player reports.

---

## Design system — "Turf"

Warm, social, clean. Light theme, one confident green accent. Chosen to look
hand-made, **not** AI-generated (no purple gradients, no emoji section headers,
no heavy glow shadows; hairline borders + generous spacing instead).

- **Logo:** the "PU / Pick Up Sports" mark — dark rounded square, white italic
  "PU", four-color bar (blue `#1d4ed8`, red `#d92d3a`, amber `#f5a623`, green
  `#17a34a`). Lives in `client/src/components/Logo.tsx` and shows on Login. Those
  four colors are reused as **per-sport accents** (basketball amber, soccer green,
  baseball blue, flag football red) via `SPORTS[].color` / `sportMeta()`.
- **Voice:** copy is plain and short. No em-dashes, no emoji, no marketing lines.

- **Font:** Plus Jakarta Sans (loaded via Google Fonts `@import` in `index.css`).
- **Tokens** live in `client/tailwind.config.js`:
  - `bg #f4f6f3`, `surface #ffffff`, `ink #1b241f`, `muted #6d7a71`,
    `faint #98a49b`, `line #e4eae4`
  - brand `green #1f7a4d` (`green-deep #186640`, `green-soft #e7f3ec`)
  - skill hues: casual `#2f9e6a`, intermediate `#3f6bd6`, competitive `#d9822b`, all `#98a49b`
  - `amber #d9822b` / `amber-soft #fbeede` (used for the confirm nudge)
- Radii: `card 18px`, `field 12px`, `pill`. Shadows are subtle (`shadow-card`).
- Reusable classes in `client/src/index.css`: `.btn-primary`, `.btn-secondary`,
  `.card`, `.chip` / `.chip-active`, `.pill-green`.
- **Important:** `client/public/index.html` must keep the light background
  (`#f4f6f3`) inline on `<body>` and `#root` — it previously hard-coded the old
  dark theme and overrode the stylesheet.

Design exploration artifacts (published, for reference): direction picker,
font options, full flow, and the show-up system were all approved by the owner.

---

## Architecture

Monorepo: `client/` (React) + `server/` (Node). Same stack as the original repo.

### Client — `client/`
- **CRA + React 18 + TypeScript + Tailwind 3**, `lucide-react` for UI icons,
  `socket.io-client` for realtime. Sport icons are hand-drawn SVGs in
  `src/icons/Sports.tsx`.
- Structure:
  - `src/types.ts` — shared types + `SPORTS`, `SKILLS`, `AGE_PRESETS` constants,
    `skillMeta()`, `ageLabel()`.
  - `src/lib/api.ts` — fetch wrapper + `api.*` calls; holds JWT in
    `localStorage['pu_token']`. `API_BASE` = same-origin in prod, `http://localhost:5001` in dev.
  - `src/lib/socket.ts` — singleton socket.io client.
  - `src/lib/push.ts` — service-worker registration + `enablePush()` subscription flow.
  - `src/context/AuthContext.tsx` — `useAuth()` (user, login, register, logout).
  - `src/data/store.tsx` — `StoreProvider`/`useStore()` (games list) **and**
    `useGameDetail(id)` (single game + live socket updates + join/leave/confirm/
    checkIn/sendMessage). Also the **pure helpers**: `gamePhase`, `activeCount`,
    `spotsLeft`, `isFull`, `confirmedCount`, `myParticipant(game, userId)`.
  - `src/screens/` — `Login`, `Browse`, `GameDetail`, `CreateGame`, `Profile`.
  - `src/components/` — `BottomNav`, `GameCard`, `Avatar`.
  - `src/App.tsx` — `AuthProvider` → `Gate` (shows `Login` if signed out, else
    `StoreProvider` + routed `AppShell`). Bottom nav hides on `/game/*` and `/create`.
- **Phase logic** (`gamePhase`): `> 4h` = upcoming, `<= 4h` = confirm window
  (shows the confirm banner), `<= 15min` = live (shows check-in).

### Server — `server/index.js` (single file, intentionally)
- **Express + Socket.io + SQLite (`sqlite3`) + JWT + bcrypt + web-push.**
- DB file `server/pickup.db` (gitignored). **Seeds sample users + 4 games on
  first run** if the users table is empty. Demo login: `mia@demo.app` / `pickup123`
  (all seed users share that password).
- Tables: `users`, `games`, `participants(status, team)`, `messages`,
  `push_subscriptions`, `reminders_sent`. `games.teams_enabled` and
  `participants.team` are added via a small `addColumn` migration in `initDb` so
  older `pickup.db` files pick them up.
- `participants.status` ∈ `joined | confirmed | checked-in | waitlisted` — this
  is the heart of the show-up loop. `activeCount` ignores waitlisted; join sets
  `waitlisted` when full; leave auto-promotes the earliest waitlisted player and
  pushes them "You're in".
- `participants.team` ∈ `a | b | null` — only meaningful when the game's
  `teams_enabled` is on (see Teams in product scope).
- Realtime: socket rooms keyed by `gameId`. Server emits `game-updated` and
  `new-message`; client dedupes messages by id.
- **Web Push:** VAPID keys auto-generated to `server/.vapid.json` (gitignored) or
  from `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` env. `runReminderSweep()` runs every
  60s and sends a "still coming?" push to `joined` (unconfirmed) players within 3h
  of start, once (tracked in `reminders_sent`).
- Push SW: `client/public/sw.js` handles `push` + `notificationclick`.

### API surface
```
POST /api/auth/register {name,email,password} -> {token,user}
POST /api/auth/login    {email,password}       -> {token,user}
GET  /api/auth/me                               -> {user}
GET  /api/games?sport=&skill=                   -> {games}
GET  /api/games/:id                             -> {game}
POST /api/games            (auth)               -> {game}
DELETE /api/games/:id      (auth, host only)
POST /api/games/:id/join|leave|confirm|checkin (auth) -> {game}
POST /api/games/:id/team {team:'a'|'b'|null} (auth)   -> {game}  (self-pick; teams must be on)
POST /api/games/:id/teams/shuffle (auth, host only)   -> {game}  (even random split)
POST /api/games/:id/teams/toggle  (auth, host only)   -> {game}  (on/off; off clears assignments)
POST /api/games/:id/messages {text} (auth)      -> {message}  (also emits socket)
GET  /api/push/vapid                            -> {publicKey}
POST /api/push/subscribe {subscription} (auth)  -> {ok}
```

---

## Running locally
```bash
# install (root, then each package)
npm install && npm --prefix server install && npm --prefix client install

# dev: client on :3000 (proxies to server via REACT_APP_API_URL/localhost:5001), server on :5001
npm run dev            # runs both via concurrently

# prod-style: build client, server serves it on :5001
npm --prefix client run build
node server/index.js   # open http://localhost:5001
```
Client build gate is **CI-strict** (`CI=true npm --prefix client run build`) —
ESLint warnings fail the build, so keep imports/deps clean.

---

## iOS app (Capacitor)

The React app is also packaged as a **native iOS app via Capacitor** so it can
run in the iPhone Simulator / on device from Xcode. There is still **one
codebase** — the iOS app is a native shell that loads the CRA web build. Edits go
to the React code as usual; a sync copies them into the app.

- Config: `client/capacitor.config.json` (`appId` `com.pickup.app`, `webDir`
  `build`). Native project lives in `client/ios/` (committed; Capacitor 8 uses
  Swift Package Manager, no CocoaPods).
- `API_BASE` (`client/src/lib/api.ts`) resolves per runtime: in the native shell
  `Capacitor.isNativePlatform()` is true, so it points at `http://localhost:5001`
  — inside the Simulator that is the Mac running `node server/index.js`. Web
  prod/dev behavior is unchanged. `REACT_APP_API_URL` still overrides everything.
- **Run in the Simulator (macOS + Xcode required):** start the backend
  (`node server/index.js`), then from `client/`: `npm run ios` (builds the web
  app, `cap sync ios`, opens Xcode) and press Run. `npm run ios:sync` just
  rebuilds + syncs without opening Xcode.
- The copied web assets (`client/ios/App/App/public/`) are gitignored — they are
  regenerated by `cap sync`, so after cloning run a build + sync before opening.

## Deploy notes / limitations
- The **reminder scheduler uses `setInterval`**, so it needs a long-running Node
  process (a real server / container), **not** Vercel serverless. `vercel.json`
  only deploys the static client; the API+push needs a Node host.
- **iOS Web Push** only works when the app is installed to the Home Screen
  (iOS 16.4+). This is the main reason SMS is on the roadmap as a fallback.
- SQLite is fine for MVP; move to Postgres for real scale.
- No image uploads/avatars yet — avatars are initials on a color hashed from user id.

## Likely next steps (not yet done)
- SMS reminders (Twilio) as a second channel in `pushToUser`-style dispatch.
- Real geolocation / distance (currently `distanceMi` is seed-only; user-created
  games are `0` and hide distance).
- Edit/cancel game UI (delete endpoint exists; no button yet).
- Postgres + a hosted deploy for the Node server.

## Git
- Feature branch: `claude/app-redesign-plan-wbo2ov`. Develop and push there.
