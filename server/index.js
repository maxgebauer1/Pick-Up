const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: true, methods: ['GET', 'POST'], credentials: true } });

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'pickup-secret-key-change-in-production';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const db = new sqlite3.Database(path.join(__dirname, 'pickup.db'));

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); })
  );
const get = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const all = (sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    city TEXT DEFAULT 'Venice, CA',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    sport TEXT NOT NULL,
    title TEXT NOT NULL,
    place TEXT NOT NULL,
    distance_mi REAL DEFAULT 0,
    starts_at TEXT NOT NULL,
    max_players INTEGER NOT NULL,
    skill TEXT NOT NULL,
    min_age INTEGER DEFAULT 0,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users (id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS participants (
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'joined',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, user_id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reminders_sent (
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, user_id, kind)
  )`);
}

// ---------------------------------------------------------------------------
// Web Push setup (VAPID keys persisted so they survive restarts)
// ---------------------------------------------------------------------------
let vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
const vapidFile = path.join(__dirname, '.vapid.json');
if (!vapid.publicKey || !vapid.privateKey) {
  if (fs.existsSync(vapidFile)) {
    vapid = JSON.parse(fs.readFileSync(vapidFile, 'utf8'));
  } else {
    vapid = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidFile, JSON.stringify(vapid, null, 2));
  }
}
webpush.setVapidDetails('mailto:hello@pickup.app', vapid.publicKey, vapid.privateKey);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AVATAR_COLORS = ['#e2564d', '#1f7a4d', '#1836d6', '#8a7a2e', '#40506e', '#c9673f', '#7a5aa0', '#2f9e6a', '#d9822b'];

function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initialsFor(name) {
  const parts = name.trim().split(/\s+/);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return chars.toUpperCase();
}
function playerOf(user) {
  return { id: user.id, name: user.name, initials: initialsFor(user.name), color: colorFor(user.id) };
}

const authMiddleware = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    req.user = payload;
    next();
  });
};

async function serializeGame(gameId) {
  const g = await get('SELECT * FROM games WHERE id = ?', [gameId]);
  if (!g) return null;
  const parts = await all(
    `SELECT p.status, p.joined_at, u.id, u.name
     FROM participants p JOIN users u ON u.id = p.user_id
     WHERE p.game_id = ? ORDER BY p.joined_at ASC`,
    [gameId]
  );
  const msgs = await all(
    `SELECT m.id, m.text, m.created_at, u.id as uid, u.name
     FROM messages m JOIN users u ON u.id = m.user_id
     WHERE m.game_id = ? ORDER BY m.created_at ASC LIMIT 200`,
    [gameId]
  );
  return {
    id: g.id,
    sport: g.sport,
    title: g.title,
    place: g.place,
    distanceMi: g.distance_mi,
    startsAt: g.starts_at,
    maxPlayers: g.max_players,
    skill: g.skill,
    minAge: g.min_age,
    creatorId: g.creator_id,
    participants: parts.map((p) => ({
      player: playerOf({ id: p.id, name: p.name }),
      status: p.status,
      isHost: p.id === g.creator_id,
    })),
    messages: msgs.map((m) => ({
      id: m.id,
      player: playerOf({ id: m.uid, name: m.name }),
      text: m.text,
      at: m.created_at,
    })),
  };
}

const activeCount = (game) => game.participants.filter((p) => p.status !== 'waitlisted').length;

async function emitGameUpdate(gameId) {
  const game = await serializeGame(gameId);
  if (game) io.to(gameId).emit('game-updated', { game });
  return game;
}

// Send a push to every subscription belonging to a user. Prunes dead endpoints.
async function pushToUser(userId, payload) {
  const subs = await all('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
  await Promise.all(
    subs.map(async (s) => {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await run('DELETE FROM push_subscriptions WHERE id = ?', [s.id]);
        }
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await run('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)', [id, name, email.toLowerCase(), hashed]);
    const user = { id, name, email: email.toLowerCase(), city: 'Venice, CA' };
    const token = jwt.sign({ id, name }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(400).json({ error: 'That email is already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, city: user.city } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await get('SELECT id, name, email, city FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.sendStatus(404);
  res.json({ user });
});

// ---------------------------------------------------------------------------
// Game routes
// ---------------------------------------------------------------------------
app.get('/api/games', async (req, res) => {
  const { sport, skill } = req.query;
  const rows = await all('SELECT id FROM games ORDER BY starts_at ASC');
  let games = (await Promise.all(rows.map((r) => serializeGame(r.id)))).filter(Boolean);
  if (sport && sport !== 'all') games = games.filter((g) => g.sport === sport);
  if (skill && skill !== 'all') games = games.filter((g) => g.skill === skill || g.skill === 'all');
  res.json({ games });
});

app.get('/api/games/:id', async (req, res) => {
  const game = await serializeGame(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json({ game });
});

app.post('/api/games', authMiddleware, async (req, res) => {
  const { sport, title, place, startsAt, maxPlayers, skill, minAge, distanceMi } = req.body;
  if (!sport || !title || !place || !startsAt || !maxPlayers || !skill) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = uuidv4();
  await run(
    `INSERT INTO games (id, sport, title, place, distance_mi, starts_at, max_players, skill, min_age, creator_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, sport, title, place, distanceMi || 0, startsAt, maxPlayers, skill, minAge || 0, req.user.id]
  );
  // creator is auto-confirmed as host
  await run('INSERT INTO participants (game_id, user_id, status) VALUES (?, ?, ?)', [id, req.user.id, 'confirmed']);
  const game = await serializeGame(id);
  res.json({ game });
});

app.delete('/api/games/:id', authMiddleware, async (req, res) => {
  const g = await get('SELECT * FROM games WHERE id = ?', [req.params.id]);
  if (!g) return res.status(404).json({ error: 'Game not found' });
  if (g.creator_id !== req.user.id) return res.status(403).json({ error: 'Only the host can cancel this game' });
  await run('DELETE FROM games WHERE id = ?', [req.params.id]);
  await run('DELETE FROM participants WHERE game_id = ?', [req.params.id]);
  await run('DELETE FROM messages WHERE game_id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/games/:id/join', authMiddleware, async (req, res) => {
  const gameId = req.params.id;
  const game = await serializeGame(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.participants.some((p) => p.player.id === req.user.id)) {
    return res.status(400).json({ error: 'Already joined' });
  }
  const status = activeCount(game) < game.maxPlayers ? 'joined' : 'waitlisted';
  await run('INSERT INTO participants (game_id, user_id, status) VALUES (?, ?, ?)', [gameId, req.user.id, status]);
  res.json({ game: await emitGameUpdate(gameId) });
});

app.post('/api/games/:id/leave', authMiddleware, async (req, res) => {
  const gameId = req.params.id;
  await run('DELETE FROM participants WHERE game_id = ? AND user_id = ?', [gameId, req.user.id]);
  // promote the earliest waitlisted player if a spot opened
  const game = await serializeGame(gameId);
  if (game && activeCount(game) < game.maxPlayers) {
    const next = game.participants.find((p) => p.status === 'waitlisted');
    if (next) {
      await run('UPDATE participants SET status = ? WHERE game_id = ? AND user_id = ?', ['joined', gameId, next.player.id]);
      await pushToUser(next.player.id, {
        title: "You're in! 🎉",
        body: `A spot opened in "${game.title}". You're off the waitlist.`,
        url: `/game/${gameId}`,
      });
    }
  }
  res.json({ game: await emitGameUpdate(gameId) });
});

async function setStatus(req, res, status) {
  const gameId = req.params.id;
  const existing = await get('SELECT * FROM participants WHERE game_id = ? AND user_id = ?', [gameId, req.user.id]);
  if (!existing) return res.status(400).json({ error: 'Not in this game' });
  if (existing.status === 'waitlisted') return res.status(400).json({ error: 'Still on the waitlist' });
  await run('UPDATE participants SET status = ? WHERE game_id = ? AND user_id = ?', [status, gameId, req.user.id]);
  res.json({ game: await emitGameUpdate(gameId) });
}
app.post('/api/games/:id/confirm', authMiddleware, (req, res) => setStatus(req, res, 'confirmed'));
app.post('/api/games/:id/checkin', authMiddleware, (req, res) => setStatus(req, res, 'checked-in'));

// ---------------------------------------------------------------------------
// Chat (posted over REST, broadcast over socket)
// ---------------------------------------------------------------------------
app.post('/api/games/:id/messages', authMiddleware, async (req, res) => {
  const { text } = req.body;
  const trimmed = (text || '').trim();
  if (!trimmed) return res.status(400).json({ error: 'Empty message' });
  const id = uuidv4();
  await run('INSERT INTO messages (id, game_id, user_id, text) VALUES (?, ?, ?, ?)', [id, req.params.id, req.user.id, trimmed]);
  const user = await get('SELECT id, name FROM users WHERE id = ?', [req.user.id]);
  const message = { id, player: playerOf(user), text: trimmed, at: new Date().toISOString() };
  io.to(req.params.id).emit('new-message', { gameId: req.params.id, message });
  res.json({ message });
});

// ---------------------------------------------------------------------------
// Push routes
// ---------------------------------------------------------------------------
app.get('/api/push/vapid', (req, res) => res.json({ publicKey: vapid.publicKey }));

app.post('/api/push/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  await run(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id`,
    [uuidv4(), req.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
  await pushToUser(req.user.id, {
    title: 'Reminders on ✅',
    body: "We'll nudge you to confirm before each game.",
    url: '/me',
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Reminder scheduler — sends a "still coming?" push a few hours before a game
// ---------------------------------------------------------------------------
async function runReminderSweep() {
  try {
    const games = await all('SELECT * FROM games');
    const now = Date.now();
    for (const g of games) {
      const hoursUntil = (new Date(g.starts_at).getTime() - now) / 3600_000;
      if (hoursUntil <= 0 || hoursUntil > 3) continue; // confirm window: within 3h of start
      const pending = await all(
        `SELECT user_id FROM participants WHERE game_id = ? AND status = 'joined'`,
        [g.id]
      );
      for (const p of pending) {
        const already = await get(
          'SELECT 1 FROM reminders_sent WHERE game_id = ? AND user_id = ? AND kind = ?',
          [g.id, p.user_id, 'confirm']
        );
        if (already) continue;
        await pushToUser(p.user_id, {
          title: `Still on for ${g.title}? 🏀`,
          body: `${g.place} — confirm so we hold your spot.`,
          url: `/game/${g.id}`,
        });
        await run('INSERT OR IGNORE INTO reminders_sent (game_id, user_id, kind) VALUES (?, ?, ?)', [g.id, p.user_id, 'confirm']);
      }
    }
  } catch (err) {
    console.error('Reminder sweep failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Socket.io — rooms for live game + chat updates (read-only broadcast channel)
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.on('join-game', (gameId) => gameId && socket.join(gameId));
  socket.on('leave-game', (gameId) => gameId && socket.leave(gameId));
});

// ---------------------------------------------------------------------------
// Seed sample data on first run
// ---------------------------------------------------------------------------
async function seedIfEmpty() {
  const count = await get('SELECT COUNT(*) as n FROM users');
  if (count.n > 0) return;

  const pw = await bcrypt.hash('pickup123', 10);
  const users = [
    ['u-jordan', 'Jordan Diaz', 'jordan@demo.app'],
    ['u-mia', 'Mia Khan', 'mia@demo.app'],
    ['u-andre', 'Andre Ruiz', 'andre@demo.app'],
    ['u-ray', 'Ray Park', 'ray@demo.app'],
    ['u-tam', 'Tam Silva', 'tam@demo.app'],
    ['u-luis', 'Luis Boyd', 'luis@demo.app'],
    ['u-nina', 'Nina Powell', 'nina@demo.app'],
    ['u-dee', 'Dee Kim', 'dee@demo.app'],
    ['u-cam', 'Cam Moss', 'cam@demo.app'],
  ];
  for (const [id, name, email] of users) {
    await run('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)', [id, name, email, pw]);
  }

  const hrs = (h) => new Date(Date.now() + h * 3600_000).toISOString();
  const games = [
    { id: 'g-hoops', sport: 'basketball', title: 'Saturday Morning Run', place: 'Venice Beach Courts', distance: 2.1, starts: hrs(3), max: 10, skill: 'intermediate', minAge: 16, creator: 'u-jordan',
      roster: [['u-jordan', 'confirmed'], ['u-mia', 'confirmed'], ['u-tam', 'confirmed'], ['u-luis', 'confirmed'], ['u-cam', 'confirmed'], ['u-andre', 'joined'], ['u-dee', 'joined'], ['u-ray', 'waitlisted']],
      chat: [['u-jordan', 'Bringing an extra ball, courts get busy 👀'], ['u-andre', 'Running 5 min late, save me a spot!']] },
    { id: 'g-soccer', sport: 'soccer', title: 'Pickup Soccer', place: 'Mission Bay Turf', distance: 1.2, starts: hrs(30), max: 18, skill: 'all', minAge: 0, creator: 'u-tam',
      roster: [['u-tam', 'joined'], ['u-luis', 'joined'], ['u-nina', 'joined'], ['u-mia', 'joined']],
      chat: [['u-tam', 'Pinnies provided, wear dark if you can']] },
    { id: 'g-flag', sport: 'flag-football', title: '5v5 Flag · Riverside', place: 'Riverside Park, Field 3', distance: 3.4, starts: hrs(6), max: 10, skill: 'competitive', minAge: 18, creator: 'u-dee',
      roster: [['u-dee', 'confirmed'], ['u-cam', 'confirmed'], ['u-jordan', 'confirmed'], ['u-andre', 'confirmed'], ['u-ray', 'confirmed'], ['u-mia', 'confirmed'], ['u-tam', 'confirmed'], ['u-luis', 'confirmed'], ['u-nina', 'confirmed'], ['u-ray', 'confirmed']],
      chat: [] },
    { id: 'g-baseball', sport: 'baseball', title: 'Weekend Baseball', place: 'Lincoln Diamond', distance: 4.0, starts: hrs(48), max: 18, skill: 'casual', minAge: 0, creator: 'u-nina',
      roster: [['u-nina', 'joined'], ['u-ray', 'joined'], ['u-dee', 'joined']],
      chat: [] },
  ];

  for (const g of games) {
    await run(
      `INSERT INTO games (id, sport, title, place, distance_mi, starts_at, max_players, skill, min_age, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [g.id, g.sport, g.title, g.place, g.distance, g.starts, g.max, g.skill, g.minAge, g.creator]
    );
    const seen = new Set();
    for (const [uid, status] of g.roster) {
      if (seen.has(uid)) continue;
      seen.add(uid);
      await run('INSERT INTO participants (game_id, user_id, status) VALUES (?, ?, ?)', [g.id, uid, status]);
    }
    for (const [uid, text] of g.chat) {
      await run('INSERT INTO messages (id, game_id, user_id, text) VALUES (?, ?, ?, ?)', [uuidv4(), g.id, uid, text]);
    }
  }
  console.log('Seeded sample users and games.');
}

// ---------------------------------------------------------------------------
// SPA fallback + boot
// ---------------------------------------------------------------------------
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));

(async () => {
  await initDb();
  await seedIfEmpty();
  setInterval(runReminderSweep, 60_000);
  server.listen(PORT, '0.0.0.0', () => console.log(`Pick Up server running on port ${PORT}`));
})();
