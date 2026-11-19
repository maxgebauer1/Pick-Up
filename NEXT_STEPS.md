# Pick Up — where I left off / next steps

_Last updated: 2026-11-18_

## Latest: the "vote on the first game" page (plain-English summary)

**What it is.** A one-page site for ad traffic. People vote on which game
they want, and we use the results to set up the first game.

**Live links**
- Vote page (the ad link): https://api.pickupsports.us/vote
- Private results page: https://api.pickupsports.us/results (password-protected)

**What people do on the vote page**
1. Type their name (we already have their email and phone).
2. Pick one game: soccer, baseball, or basketball.
3. See the $5 buy-in. It goes to the "captain" for organizing the game and is
   collected only once the game is being finalized, not at signup.
4. Optionally check a box to be eligible to be the captain.
5. Pick every Saturday and Sunday time that works (9am, 11am, 1pm, 3pm, 5pm).
6. Submit. There is also a public chat at the bottom.
The page says the first game is "next weekend" (no dates, so update the wording
when that stops being true).

**Where the data goes.** Into our Neon database (the same one as the waitlist),
in two tables: `game_votes` (name, game, captain yes/no, times) and
`chat_messages`. It is NOT in GitHub, GitHub only holds the code.

**How to see the data.** Open the results page and enter the password. It shows
vote counts per game, the most popular times, who volunteered as captain, a
table of everyone, and the chat log. The password is stored as the
`RESULTS_PASSWORD` environment variable in the Vercel project `waitlist-api`
(change it there, then redeploy). It is not written in this repo on purpose.

**Look.** Cream paper background, navy text, red-orange accent, gold for the
buy-in. Fonts are Barlow and Barlow Condensed. This is intentionally different
from the app's "Turf" green look.

**Where the files are** (all in `waitlist-api/`): `vote.html`, `results.html`,
`api/vote.js`, `api/chat.js`, `api/results.js`, plus routes in `vercel.json`.

**How it was deployed.** Run `npx vercel --prod` from `waitlist-api/`. Pushing
to GitHub does not deploy this project automatically.

**Still to do / loose ends**
- Delete the two fake test players (Jake M and Marcus T) and their two test chat
  messages before counting real results.
- Not added yet: Meta Pixel and a conversion event on submit (needed for ad
  tracking).
- The chat is public with no moderation. Check it once ads are running.
- Money games were "cut on purpose" in `CLAUDE.md`. The $5 buy-in was added at
  the owner's request, so that doc may need updating.
- Vercel suggested turning on two-factor authentication for the account.

---

## Earlier: July 27 session

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
