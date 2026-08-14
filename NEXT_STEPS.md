# Pick Up — where I left off / next steps

_Last updated: 2026-07-27_

## Status: shipped to main

- `main` now holds the full app: the Turf redesign, real backend (auth,
  browse, create, join/leave, confirm, check-in, waitlist, lobby chat, Web
  Push), plus this session's changes below. It was a clean fast-forward, so
  `main` is the source of truth now.
- The old **PR #1** (`claude/app-redesign-plan-wbo2ov` -> `main`) is
  superseded. `main` already contains everything it had, so that PR can just
  be closed.
- Work branch for this session: `claude/open-app-bkbege` (also on `main`).
- Architecture + how-to-run details live in **`CLAUDE.md`**.
- Demo login: `mia@demo.app` / `pickup123` (all seed users share that password).

## Done this session (2026-07-27)

1. **Logo.** New PU mark in `client/src/components/Logo.tsx` (dark square,
   white "PU", the four-color bar) on the Login screen.
2. **Logo colorways.** The four bar colors are now the per-sport accents:
   basketball amber, soccer green, baseball blue, flag football red. See
   `SPORTS[].color` / `sportMeta()` in `client/src/types.ts`, used on the game
   tags in `GameCard` and `GameDetail`.
3. **Slogan** is now "Always on" (Login).
4. **Ages** are 18+ / 35+ / 45+ (plus All ages). `AGE_PRESETS` in `types.ts`.
5. **Plainer copy.** Dropped the em-dashes, emoji, and marketing lines from the
   screens, push notifications, and page metadata.
6. **Teams (new feature).** Hosts toggle it per game (at create time and on the
   game screen). When on, players pick their own side or the host shuffles the
   active roster into two even random sides. Turning it off clears every
   assignment. Colors are the blue/red from the logo bar.
   - Server: `games.teams_enabled`, `participants.team`, a small `addColumn`
     migration, and routes `POST /api/games/:id/team|teams/shuffle|teams/toggle`.
   - Client: Team A/B columns + "pick your side" in `GameDetail`, the toggle in
     `CreateGame`, wiring in `store.tsx` / `lib/api.ts`.
   - The seeded basketball game ships with teams on so it shows up right away.

## Pick up here — decide what's next

1. **Review and edit landing page.** Lives in `landing/` (index.html,
   style.css, script.js) — static, no build step. Most headline/subhead copy
   is intentionally left as bracketed placeholder text to fill in. Two signup
   forms (email + phone) validate and work but aren't wired to a real backend
   yet (`WAITLIST_ENDPOINT` in `script.js`). The basketball/baseball art is
   custom SVG illustration, not photos — no AI image generation was available
   when this was built.
2. **Deploy it.** The API + push need a long-running Node host (Render /
   Railway / Fly / a VM), NOT Vercel serverless, because the reminder scheduler
   uses setInterval. The static client can go on Vercel; the server can't.
3. **SMS reminders (Twilio)** as a second channel. The notification layer is
   already channel-agnostic, so it slots in. iOS Web Push only works once the
   app is added to the Home Screen, so SMS is the fallback.
4. **Smaller polish, optional:**
   - Real geolocation / distance (currently seed-only; user-made games show no distance)
   - Edit / cancel-game button (delete endpoint already exists, no UI yet)
   - Move SQLite to Postgres before real scale

## To run it again locally
```bash
npm install && npm --prefix server install && npm --prefix client install
npm --prefix client run build
node server/index.js     # http://localhost:5001
```

## How to restart with me
Just say e.g. "help me deploy the server", "start on SMS reminders", or "add an
edit-game screen." Everything is committed on `main`.
