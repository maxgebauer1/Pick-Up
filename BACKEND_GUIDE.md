# Understanding & Building the Pick Up Backend 🛠️

A guided tour of **your** backend — what each piece does, why it's there, and how to
extend and deploy it. Read this top-to-bottom and you'll understand how the whole
server works.

---

## 1. What a "backend" actually is

Your app has two halves:

- **Frontend** (`client/`) — the React app that runs *on the user's phone/browser*.
  It's just the UI. It can't safely store data, and everyone's copy is separate.
- **Backend** (`server/`) — one program running *on a server you control*. It's the
  single source of truth: it holds the database, checks passwords, and decides who's
  allowed to do what.

When you tap "Join game," the phone sends an HTTP request over the internet to the
backend. The backend updates the shared database and tells everyone else. Without a
backend, two players could never see the same game.

Your backend is **~1100 lines in one file: `server/index.js`**. Let's break it down.

---

## 2. The three technologies

Your `server/package.json` pulls in a few key libraries:

| Library | Role | Plain English |
|---|---|---|
| **Express** | Web framework | Maps URLs like `POST /api/login` to functions. |
| **Socket.io** | Real-time | Instant two-way messaging for chat & live game updates. |
| **SQLite** (`sqlite3`) | Database | Stores users, games, friends — in a single file `pickup.db`. |
| **bcryptjs** | Security | Hashes passwords so they're never stored in plain text. |
| **jsonwebtoken** (JWT) | Auth | Issues a "login token" that proves who a user is. |
| **cors** | Browser rule | Lets your frontend (different origin) call the backend. |
| **uuid** | IDs | Generates unique IDs like `a1b2c3...` for every row. |

---

## 3. How a request flows (the mental model)

```
 iPhone (React)                 Server (Express)              Database (SQLite)
      │                               │                              │
      │  POST /api/login  ─────────▶  │                              │
      │  {email, password}            │  SELECT * FROM users ─────▶  │
      │                               │  ◀──────────── user row      │
      │                               │  bcrypt.compare(password)    │
      │                               │  jwt.sign(...) → token       │
      │  ◀───── {token, user} ─────── │                              │
      │                                                              
      │  (stores token, sends it on every future request)
```

Every protected request carries the token in a header:
`Authorization: Bearer <token>`. The server verifies it before doing anything.

---

## 4. Reading your `server/index.js`, section by section

### a) Setup (lines ~1–35)
Creates the Express app, wraps it in an HTTP server, attaches Socket.io, enables
CORS, and opens the SQLite database file `pickup.db`.

```js
const app = express();               // the web server
const server = http.createServer(app);
const io = socketIo(server, { ... }); // real-time layer on the same server
app.use(express.json());             // auto-parse JSON request bodies
const db = new sqlite3.Database('./pickup.db');
```

### b) The database schema (lines ~38–196)
`db.serialize()` runs `CREATE TABLE IF NOT EXISTS ...` for each table. This is your
**data model** — the shape of everything the app stores:

- `users` — accounts, profile, location, favorite sport.
- `games` — each pickup game (sport, location, max players, entry fee…).
- `game_participants` — who joined which game (a many-to-many link).
- `user_sports` — each user's sports + skill levels.
- `game_results` — win/loss records per game.
- `friends` — friend requests and accepted friendships.
- `chat_messages` — in-game chat history.
- `player_reports` — user reports for moderation.

> The `ALTER TABLE ... ADD COLUMN` calls near the end are **migrations** — they add
> new columns to an existing database without wiping it. That's how you evolve a
> schema after users already have data.

### c) The auth guard (lines ~198–212)
```js
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);      // not logged in
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);        // bad/expired token
    req.user = user;                             // attach the user, continue
    next();
  });
};
```
Any route that includes `authenticateToken` is **login-required**. `req.user` then
holds the logged-in user's id — that's how the server knows "who is asking."

### d) The routes (the bulk of the file)
Each `app.METHOD('/path', handler)` is one API endpoint. Yours include:

| Method + path | What it does |
|---|---|
| `POST /api/register` | Create account (hashes password, returns token). |
| `POST /api/login` | Check password, return token. |
| `GET /api/games` | List open games, optionally filtered by distance. |
| `POST /api/games` | Create a game (login required). |
| `POST /api/games/:id/join` | Join a game; emits `playerJoined` in real time. |
| `POST /api/games/:id/leave` | Leave a game. |
| `POST /api/games/:id/complete` | Save final scores & win/loss records. |
| `GET /api/profile` | Your profile + sports + stats. |
| `GET/POST /api/friends*` | Friend requests, accept/reject, list. |
| `GET /api/leaderboard/*` | Rankings by record or earnings. |

Notice the pattern in every handler: **validate input → run a SQL query → send JSON.**
That repetition *is* backend development.

### e) Real-time with Socket.io (lines ~1047–1105)
HTTP is one-shot (ask → answer). Chat needs the server to *push* messages without
being asked. That's Socket.io:

```js
io.on('connection', (socket) => {
  socket.on('joinGameRoom', ({ gameId }) => socket.join(gameId)); // a chat "room"
  socket.on('sendMessage', ({ gameId, message }) => {
    // save to DB, then broadcast to everyone in that room:
    io.to(gameId).emit('newMessage', { ... });
  });
});
```
The frontend (`client/src/components/Chat.tsx`) listens for `newMessage` and updates
the UI instantly. The `io.emit('playerJoined', ...)` calls in the join/leave routes
do the same for live lobby updates.

### f) Serving the frontend (lines ~31, 1107–1110)
```js
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => res.sendFile('.../client/build/index.html'));
```
In production the *same* server can hand out the built React files. (Your native iOS
app won't use this — it bundles the web assets locally and only calls the `/api/*`
routes.)

---

## 5. Run it yourself locally

```bash
cd server
npm install
npm run dev        # nodemon = auto-restart on file changes
# → "Server running on port 5001"
```
Test an endpoint without the frontend:
```bash
curl -X POST http://localhost:5001/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alex","email":"a@b.com","password":"secret123"}'
# → {"token":"eyJ...","user":{...}}
```
That token is what you'd paste into `Authorization: Bearer <token>` to call protected
routes. This is the entire loop of backend work: start server → hit endpoint → read
the JSON → check the database.

---

## 6. How to add a new feature (worked example)

Say you want an endpoint to **favorite a game**. The recipe is always the same:

**1. Add a table** (in the `db.serialize` block):
```js
db.run(`CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  PRIMARY KEY (user_id, game_id)
)`);
```

**2. Add a route:**
```js
app.post('/api/games/:gameId/favorite', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  db.run(
    'INSERT OR IGNORE INTO favorites (user_id, game_id) VALUES (?, ?)',
    [req.user.id, gameId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Favorited' });
    }
  );
});
```

**3. Call it from React:**
```ts
await fetch(`${getApiBaseUrl()}/api/games/${id}/favorite`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});
```
That's it — **table, route, fetch.** Almost every feature you'll ever add follows
this pattern.

> **Note the `?` placeholders.** Always pass values as the array argument, never by
> string-concatenating them into the SQL. That's what prevents *SQL injection*, the
> most common web vulnerability.

---

## 7. Deploying the backend to the internet

Your iOS app needs a backend with a **public HTTPS URL**. Best free/cheap options
for a Node + Socket.io app:

| Host | Why | Notes |
|---|---|---|
| **[Render](https://render.com)** ⭐ | Easiest for beginners | Free tier, HTTPS automatic, supports WebSockets (Socket.io). |
| **[Railway](https://railway.app)** | Very smooth DX | Small monthly credit, HTTPS + WebSockets. |
| **[Fly.io](https://fly.io)** | Runs close to users | Slightly more config. |

⚠️ **Avoid Vercel/Netlify for this backend.** They're built for stateless functions
and don't hold a long-lived Socket.io connection or a persistent SQLite file well.
Use them for the *frontend* if you want, but host the Express server on Render/Railway.

### Deploy to Render (typical flow)
1. Push this repo to GitHub.
2. On Render: **New → Web Service**, connect the repo.
3. Set **Root Directory** = `server`, **Build Command** = `npm install`,
   **Start Command** = `npm start`.
4. Render gives you `https://pickup-api.onrender.com`. Put that in your
   `client/.env` as `REACT_APP_API_URL`, then rebuild the iOS app.

---

## 8. Before real users: the "grown-up" checklist

Your backend is a great MVP. These are the things to harden before it's production-grade:

1. **Move the JWT secret to an env var.** Right now `JWT_SECRET` is hardcoded in
   `index.js` (line ~22). Anyone who sees the code can forge logins. Use
   `process.env.JWT_SECRET` and set it on your host.
2. **Give tokens an expiry:** `jwt.sign(payload, SECRET, { expiresIn: '7d' })`.
3. **Outgrow SQLite when you scale.** SQLite is a single file — perfect for an MVP and
   one server. When you need multiple servers or lots of concurrent writes, migrate to
   **PostgreSQL** (Render/Railway offer managed Postgres). The SQL you already know
   mostly carries over.
4. **Tighten CORS.** `origin: true` allows *any* website to call your API. In
   production, restrict it to your real domains.
5. **Validate & rate-limit.** Add input validation (e.g. `zod`) and a rate limiter
   (`express-rate-limit`) so the API can't be abused.
6. **Back up the database.** With SQLite, that's copying `pickup.db` somewhere safe on
   a schedule (and note: many free hosts have *ephemeral* disks that reset on redeploy —
   another reason to move to managed Postgres once it matters).

---

## 9. Where to learn more

- **Express** — https://expressjs.com/en/starter/basic-routing.html
- **SQL basics** — https://sqlbolt.com (interactive, ~1 hour, hugely worth it)
- **JWT explained** — https://jwt.io/introduction
- **Socket.io** — https://socket.io/docs/v4/
- **HTTP status codes** — https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

You already have a working, real-world backend in front of you — the fastest way to
learn is to change one route, restart, and watch what happens.
