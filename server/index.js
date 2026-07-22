require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ---- Configuration (all overridable via environment variables) ----
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'pickup-dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️  JWT_SECRET is not set — using an insecure development default. ' +
    'Set JWT_SECRET in your environment before deploying to production.'
  );
}

// CORS: in dev (no ALLOWED_ORIGINS) allow all origins so local network / native
// testing works. In production set ALLOWED_ORIGINS to a comma-separated list.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true;

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ---- Security & parsing middleware ----
// helmet sets safe HTTP headers. CSP and CORP are disabled because this server
// also serves the React app and is called cross-origin by the web/native client.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Rate limiter for authentication endpoints to slow down brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // max attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' }
});

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Database setup
const db = new sqlite3.Database('./pickup.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    age INTEGER,
    location TEXT,
    current_location TEXT,
    current_location_lat REAL,
    current_location_lng REAL,
    home_location TEXT,
    home_location_lat REAL,
    home_location_lng REAL,
    favorite_sport TEXT,
    profile_pic TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Games table
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sport TEXT NOT NULL,
    location TEXT NOT NULL,
    location_lat REAL,
    location_lng REAL,
    place_id TEXT,
    max_players INTEGER NOT NULL,
    current_players INTEGER DEFAULT 0,
    creator_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_time TEXT,
    level TEXT,
    is_casual INTEGER DEFAULT 0,
    is_private INTEGER DEFAULT 0,
    min_age INTEGER DEFAULT 0,
    is_money_game INTEGER DEFAULT 0,
    entry_fee REAL DEFAULT 0,
    total_pot REAL DEFAULT 0,
    FOREIGN KEY (creator_id) REFERENCES users (id)
  )`);

  // Game participants table
  db.run(`CREATE TABLE IF NOT EXISTS game_participants (
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, user_id),
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // User sports preferences table
  db.run(`CREATE TABLE IF NOT EXISTS user_sports (
    user_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    skill_level INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, sport),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Game results table
  db.run(`CREATE TABLE IF NOT EXISTS game_results (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    result TEXT NOT NULL,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Friends table
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (friend_id) REFERENCES users (id),
    UNIQUE(user_id, friend_id)
  )`);

  // Chat messages table
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Player reports table
  db.run(`CREATE TABLE IF NOT EXISTS player_reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    reported_user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users (id),
    FOREIGN KEY (reported_user_id) REFERENCES users (id),
    FOREIGN KEY (game_id) REFERENCES games (id)
  )`);

  // Add new columns to existing users table if they don't exist
  db.run(`ALTER TABLE users ADD COLUMN current_location TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding current_location column:', err);
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN current_location_lat REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding current_location_lat column:', err);
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN current_location_lng REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding current_location_lng column:', err);
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN home_location TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding home_location column:', err);
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN home_location_lat REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding home_location_lat column:', err);
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN home_location_lng REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding home_location_lng column:', err);
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN favorite_sport TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding favorite_sport column:', err);
    }
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Health check — used by hosting platforms (Render, Railway, etc.) to verify
// the server is alive, and handy for a quick "is it up?" curl.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Register
app.post('/api/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Basic input validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [userId, username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ token, user: { id: userId, username, email } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', authLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Get a specific game by ID (for private games)
app.get('/api/games/:gameId', (req, res) => {
  const { gameId } = req.params;
  
  db.get(`
    SELECT g.*, u.username as creator_name, 
           COUNT(gp.user_id) as current_players,
           g.level, g.is_casual, g.is_private, g.min_age, g.is_money_game, g.entry_fee, g.total_pot
    FROM games g
    LEFT JOIN users u ON g.creator_id = u.id
    LEFT JOIN game_participants gp ON g.id = gp.game_id
    WHERE g.id = ?
    GROUP BY g.id
  `, [gameId], (err, game) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  });
});

// Get all games with optional radius search
app.get('/api/games', (req, res) => {
  const { lat, lng, radius } = req.query;
  
  let query = `
    SELECT g.*, u.username as creator_name, 
           COUNT(gp.user_id) as current_players,
           g.level, g.is_casual, g.is_private, g.min_age, g.is_money_game, g.entry_fee, g.total_pot
    FROM games g
    LEFT JOIN users u ON g.creator_id = u.id
    LEFT JOIN game_participants gp ON g.id = gp.game_id
    WHERE g.status = 'open' AND g.is_private = 0
  `;
  
  let params = [];
  
  // Add radius search if coordinates and radius are provided
  if (lat && lng && radius) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);
    
    // Haversine formula to calculate distance
    query += `
      AND (
        g.location_lat IS NOT NULL 
        AND g.location_lng IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(?)) * cos(radians(g.location_lat)) * 
            cos(radians(g.location_lng) - radians(?)) + 
            sin(radians(?)) * sin(radians(g.location_lat))
          )
        ) <= ?
      )
    `;
    params = [latNum, lngNum, latNum, radiusNum];
  }
  
  query += ` GROUP BY g.id ORDER BY g.created_at DESC`;
  
  db.all(query, params, (err, games) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(games);
  });
});

// Create a new game
app.post('/api/games', authenticateToken, (req, res) => {
  console.log('Create game request body:', req.body); // Debug log
  const { title, sport, location, locationData, maxPlayers, gameTime, level, isCasual, isPrivate, minAge, isMoneyGame, entryFee } = req.body;
  
  if (!title || !sport || !location || !maxPlayers || !gameTime || !level) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const gameId = uuidv4();
  const locationLat = locationData?.lat || null;
  const locationLng = locationData?.lng || null;
  const placeId = locationData?.place_id || null;
  const minimumAge = minAge || 0;
  const isMoney = isMoneyGame || false;
  const fee = entryFee || 0;
  const totalPot = isMoney ? fee * maxPlayers : 0;
  
  db.run(
    'INSERT INTO games (id, title, sport, location, location_lat, location_lng, place_id, max_players, creator_id, game_time, level, is_casual, is_private, min_age, is_money_game, entry_fee, total_pot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [gameId, title, sport, location, locationLat, locationLng, placeId, maxPlayers, req.user.id, gameTime, level, isCasual ? 1 : 0, isPrivate ? 1 : 0, minimumAge, isMoney ? 1 : 0, fee, totalPot],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Add creator as first participant
      db.run(
        'INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
        [gameId, req.user.id]
      );
      
      res.json({ id: gameId, message: 'Game created successfully' });
    }
  );
});

// Join a game
app.post('/api/games/:gameId/join', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'open') return res.status(400).json({ error: 'Game is not open' });
    
    // Check if user is already in the game
    db.get('SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?', 
      [gameId, req.user.id], (err, participant) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (participant) return res.status(400).json({ error: 'Already joined this game' });
      
      // Check if game is full
      db.get('SELECT COUNT(*) as count FROM game_participants WHERE game_id = ?', 
        [gameId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.count >= game.max_players) {
          return res.status(400).json({ error: 'Game is full' });
        }
        
        // Join the game
        db.run('INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
          [gameId, req.user.id], function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          
          // Emit to all connected clients
          io.emit('playerJoined', { gameId, userId: req.user.id, username: req.user.username });
          res.json({ message: 'Joined game successfully' });
        });
      });
    });
  });
});

// Check if user has joined a game
app.get('/api/games/:gameId/joined', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  
  db.get('SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?', 
    [gameId, req.user.id], (err, participant) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ joined: !!participant });
  });
});

// Leave a game
app.post('/api/games/:gameId/leave', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  
  db.run('DELETE FROM game_participants WHERE game_id = ? AND user_id = ?',
    [gameId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Emit to all connected clients
    io.emit('playerLeft', { gameId, userId: req.user.id, username: req.user.username });
    res.json({ message: 'Left game successfully' });
  });
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(`
    SELECT u.id, u.username, u.email, u.age, u.location, u.current_location, u.current_location_lat, u.current_location_lng,
           u.home_location, u.home_location_lat, u.home_location_lng, u.favorite_sport, u.profile_pic, u.created_at
    FROM users u
    WHERE u.id = ?
  `, [req.user.id], (err, profile) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Get user's sports preferences
    db.all(`
      SELECT sport, skill_level, is_primary
      FROM user_sports
      WHERE user_id = ?
      ORDER BY is_primary DESC, skill_level DESC
    `, [req.user.id], (err, sports) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      // Get game statistics
      db.all(`
        SELECT
          COUNT(*) as total_games,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
        FROM game_results
        WHERE user_id = ?
      `, [req.user.id], (err, stats) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const gameStats = stats[0] || { total_games: 0, wins: 0, losses: 0 };

        res.json({
          ...profile,
          sports: sports || [],
          stats: gameStats
        });
      });
    });
  });
});

// Get public user profile by userId
app.get('/api/users/:userId/profile', authenticateToken, (req, res) => {
  const { userId } = req.params;

  db.get(`
    SELECT u.id, u.username, u.age, u.location, u.favorite_sport, u.profile_pic, u.created_at
    FROM users u
    WHERE u.id = ?
  `, [userId], (err, profile) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!profile) return res.status(404).json({ error: 'User not found' });

    // Get user's sports preferences
    db.all(`
      SELECT sport, skill_level, is_primary
      FROM user_sports
      WHERE user_id = ?
      ORDER BY is_primary DESC, skill_level DESC
    `, [userId], (err, sports) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      // Get game statistics
      db.all(`
        SELECT
          COUNT(*) as total_games,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
        FROM game_results
        WHERE user_id = ?
      `, [userId], (err, stats) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const gameStats = stats[0] || { total_games: 0, wins: 0, losses: 0 };

        res.json({
          ...profile,
          sports: sports || [],
          stats: gameStats
        });
      });
    });
  });
});

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const { username, age, location, current_location, current_location_lat, current_location_lng, 
          home_location, home_location_lat, home_location_lng, favorite_sport, profile_pic, sports } = req.body;
  
  db.run(`
    UPDATE users 
    SET username = ?, age = ?, location = ?, current_location = ?, current_location_lat = ?, current_location_lng = ?,
        home_location = ?, home_location_lat = ?, home_location_lng = ?, favorite_sport = ?, profile_pic = ?
    WHERE id = ?
  `, [username, age, location, current_location, current_location_lat, current_location_lng, 
      home_location, home_location_lat, home_location_lng, favorite_sport, profile_pic, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Update sports preferences if provided
    if (sports && Array.isArray(sports)) {
      // Delete existing sports preferences
      db.run('DELETE FROM user_sports WHERE user_id = ?', [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Insert new sports preferences
        const insertPromises = sports.map(sport => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO user_sports (user_id, sport, skill_level, is_primary) VALUES (?, ?, ?, ?)',
              [req.user.id, sport.sport, sport.skill_level, sport.is_primary ? 1 : 0],
              (err) => err ? reject(err) : resolve()
            );
          });
        });
        
        Promise.all(insertPromises)
          .then(() => res.json({ message: 'Profile updated successfully' }))
          .catch(err => res.status(500).json({ error: 'Database error' }));
      });
    } else {
      res.json({ message: 'Profile updated successfully' });
    }
  });
});

// Get game participants
app.get('/api/games/:gameId/participants', (req, res) => {
  const { gameId } = req.params;
  
  db.all(`
    SELECT u.id, u.username, gp.joined_at
    FROM game_participants gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.game_id = ?
    ORDER BY gp.joined_at ASC
  `, [gameId], (err, participants) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(participants);
  });
});

// Cancel (delete) a game by its creator
app.delete('/api/games/:gameId', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  // Only allow the creator to delete the game
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can cancel this game' });
    }
    // Delete the game and all related participants
    db.run('DELETE FROM games WHERE id = ?', [gameId], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.run('DELETE FROM game_participants WHERE game_id = ?', [gameId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Game cancelled successfully' });
      });
    });
  });
});

// Complete a game and submit results
app.post('/api/games/:gameId/complete', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  const { results } = req.body; // { homeScore, awayScore }
  
  if (!results || typeof results.homeScore !== 'number' || typeof results.awayScore !== 'number') {
    return res.status(400).json({ error: 'Home and away scores are required' });
  }
  
  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can complete this game' });
    }
    
    // Get all participants to determine winners/losers
    db.all('SELECT user_id FROM game_participants WHERE game_id = ?', [gameId], (err, participants) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Determine which team won based on scores
      const homeWon = results.homeScore > results.awayScore;
      const awayWon = results.awayScore > results.homeScore;
      const isTie = results.homeScore === results.awayScore;
      
      // Insert results for each participant
      const insertPromises = participants.map((participant, index) => {
        return new Promise((resolve, reject) => {
          // Determine result based on team assignment (even indices = home, odd indices = away)
          let result = 'tie';
          if (!isTie) {
            if (index % 2 === 0) { // Home team
              result = homeWon ? 'win' : 'loss';
            } else { // Away team
              result = awayWon ? 'win' : 'loss';
            }
          }
          
          db.run(
            'INSERT INTO game_results (id, game_id, user_id, result, score, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [require('uuid').v4(), gameId, participant.user_id, result, index % 2 === 0 ? results.homeScore : results.awayScore],
            (err) => err ? reject(err) : resolve()
          );
        });
      });
      
      Promise.all(insertPromises)
        .then(() => {
          // Mark game as completed
          db.run('UPDATE games SET status = ? WHERE id = ?', ['completed', gameId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Game completed and results saved' });
          });
        })
        .catch(() => res.status(500).json({ error: 'Database error' }));
    });
  });
});

// Friends API endpoints

// Search users by username
app.get('/api/users/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  
  db.all(`
    SELECT id, username, email, age, location, created_at
    FROM users 
    WHERE username LIKE ? AND id != ?
    ORDER BY username
    LIMIT 20
  `, [`%${q}%`, req.user.id], (err, users) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(users);
  });
});

// Send friend request
app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  
  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }
  
  if (friendId === req.user.id) {
    return res.status(400).json({ error: 'Cannot send friend request to yourself' });
  }
  
  // Check if friend request already exists
  db.get('SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', 
    [req.user.id, friendId, friendId, req.user.id], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existing) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }
    
    // Create friend request
    const friendRequestId = uuidv4();
    db.run('INSERT INTO friends (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)', 
      [friendRequestId, req.user.id, friendId, 'pending'], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Friend request sent successfully' });
    });
  });
});

// Accept friend request
app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  
  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }
  
  db.run('UPDATE friends SET status = ? WHERE friend_id = ? AND user_id = ? AND status = ?', 
    ['accepted', req.user.id, friendId, 'pending'], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    res.json({ message: 'Friend request accepted' });
  });
});

// Reject friend request
app.post('/api/friends/reject', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  
  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }
  
  db.run('DELETE FROM friends WHERE friend_id = ? AND user_id = ? AND status = ?', 
    [req.user.id, friendId, 'pending'], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Friend request rejected' });
  });
});

// Remove friend
app.delete('/api/friends/:friendId', authenticateToken, (req, res) => {
  const { friendId } = req.params;
  
  db.run('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', 
    [req.user.id, friendId, friendId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Friend removed successfully' });
  });
});

// Get friends list
app.get('/api/friends', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      u.id, u.username, u.email, u.age, u.location, u.created_at,
      f.status, f.created_at as friendship_date
    FROM friends f
    JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
    WHERE (f.user_id = ? OR f.friend_id = ?) 
    AND f.status = 'accepted'
    AND u.id != ?
    ORDER BY u.username
  `, [req.user.id, req.user.id, req.user.id], (err, friends) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(friends);
  });
});

// Get pending friend requests
app.get('/api/friends/pending', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      u.id, u.username, u.email, u.age, u.location, u.created_at,
      f.created_at as request_date
    FROM friends f
    JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `, [req.user.id], (err, requests) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(requests);
  });
});

// Chat API endpoints

// Get chat messages for a game
app.get('/api/games/:gameId/chat', authenticateToken, (req, res) => {
  const { gameId } = req.params;
  
  db.all(`
    SELECT 
      cm.id, cm.message, cm.created_at,
      u.id as user_id, u.username
    FROM chat_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.game_id = ?
    ORDER BY cm.created_at ASC
    LIMIT 100
  `, [gameId], (err, messages) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(messages);
  });
});

// Report a player
app.post('/api/reports', authenticateToken, (req, res) => {
  const { reportedUserId, gameId, reason, description } = req.body;
  
  if (!reportedUserId || !gameId || !reason) {
    return res.status(400).json({ error: 'Reported user ID, game ID, and reason are required' });
  }
  
  if (reportedUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot report yourself' });
  }
  
  // Check if user is already reported in this game
  db.get('SELECT * FROM player_reports WHERE reporter_id = ? AND reported_user_id = ? AND game_id = ?', 
    [req.user.id, reportedUserId, gameId], (err, existingReport) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this player for this game' });
    }
    
    // Create the report
    const reportId = uuidv4();
    db.run(
      'INSERT INTO player_reports (id, reporter_id, reported_user_id, game_id, reason, description) VALUES (?, ?, ?, ?, ?, ?)',
      [reportId, req.user.id, reportedUserId, gameId, reason, description || null],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Report submitted successfully', reportId });
      }
    );
  });
});

// Get all reports (admin endpoint for testing)
app.get('/api/reports', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      pr.id, pr.reason, pr.description, pr.status, pr.created_at,
      reporter.username as reporter_username,
      reported.username as reported_username,
      g.title as game_title
    FROM player_reports pr
    JOIN users reporter ON pr.reporter_id = reporter.id
    JOIN users reported ON pr.reported_user_id = reported.id
    JOIN games g ON pr.game_id = g.id
    ORDER BY pr.created_at DESC
  `, (err, reports) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(reports);
  });
});

// Find similar friends based on location and favorite sport
app.get('/api/friends/similar', authenticateToken, (req, res) => {
  const { lat, lng, radius = 30 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }
  
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const searchRadius = parseFloat(radius);
  
  // First get the current user's favorite sport
  db.get('SELECT favorite_sport FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user || !user.favorite_sport) {
      return res.status(400).json({ error: 'User must have a favorite sport set' });
    }
    
    // Find users within radius who have the same favorite sport
    const query = `
      SELECT 
        u.id, u.username, u.email, u.age, u.current_location, u.home_location, u.favorite_sport, u.profile_pic,
        u.current_location_lat, u.current_location_lng, u.home_location_lat, u.home_location_lng,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(COALESCE(u.current_location_lat, u.home_location_lat))) * 
            cos(radians(COALESCE(u.current_location_lng, u.home_location_lng)) - radians(?)) + 
            sin(radians(?)) * sin(radians(COALESCE(u.current_location_lat, u.home_location_lat)))
          )
        ) as distance
      FROM users u
      WHERE u.id != ? 
        AND u.favorite_sport = ?
        AND (
          (u.current_location_lat IS NOT NULL AND u.current_location_lng IS NOT NULL) OR
          (u.home_location_lat IS NOT NULL AND u.home_location_lng IS NOT NULL)
        )
        AND (
          6371 * acos(
            cos(radians(?)) * cos(radians(COALESCE(u.current_location_lat, u.home_location_lat))) * 
            cos(radians(COALESCE(u.current_location_lng, u.home_location_lng)) - radians(?)) + 
            sin(radians(?)) * sin(radians(COALESCE(u.current_location_lat, u.home_location_lat)))
          )
        ) <= ?
      ORDER BY distance ASC
      LIMIT 10
    `;
    
    db.all(query, [userLat, userLng, userLat, req.user.id, user.favorite_sport, userLat, userLng, userLat, searchRadius], (err, friends) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(friends);
    });
  });
});

// Get leaderboard for best records (League A & B)
app.get('/api/leaderboard/records', (req, res) => {
  const { league } = req.query;
  
  if (!league || !['A', 'B'].includes(league)) {
    return res.status(400).json({ error: 'League must be A or B' });
  }
  
  const query = `
    SELECT 
      u.id,
      u.username,
      u.profile_pic,
      COUNT(gr.id) as total_games,
      SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN gr.result = 'loss' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN gr.result = 'tie' THEN 1 ELSE 0 END) as ties,
      ROUND(
        (SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(gr.id), 0), 2
      ) as win_percentage
    FROM users u
    JOIN game_results gr ON u.id = gr.user_id
    JOIN games g ON gr.game_id = g.id
    WHERE g.level = ? AND g.status = 'completed'
    GROUP BY u.id, u.username, u.profile_pic
    HAVING total_games >= 3
    ORDER BY win_percentage DESC, total_games DESC
    LIMIT 20
  `;
  
  db.all(query, [league], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Get leaderboard for highest earning players (money games)
app.get('/api/leaderboard/earnings', (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.profile_pic,
      COUNT(gr.id) as money_games_played,
      SUM(CASE WHEN gr.result = 'win' THEN g.entry_fee ELSE 0 END) as total_earnings,
      SUM(CASE WHEN gr.result = 'loss' THEN g.entry_fee ELSE 0 END) as total_losses,
      SUM(g.entry_fee) as total_wagered,
      ROUND(
        (SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(gr.id), 0), 2
      ) as win_percentage
    FROM users u
    JOIN game_results gr ON u.id = gr.user_id
    JOIN games g ON gr.game_id = g.id
    WHERE g.is_money_game = 1 AND g.status = 'completed'
    GROUP BY u.id, u.username, u.profile_pic
    HAVING money_games_played >= 1
    ORDER BY total_earnings DESC, win_percentage DESC
    LIMIT 20
  `;
  
  db.all(query, [], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Get player game history
app.get('/api/profile/game-history', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      g.id as game_id,
      g.title,
      g.sport,
      g.location,
      g.game_time,
      g.level,
      g.is_casual,
      g.is_money_game,
      g.entry_fee,
      g.total_pot,
      g.created_at as game_created_at,
      gr.result,
      gr.score,
      gr.created_at as completed_at
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE gr.user_id = ? AND g.status = 'completed'
    ORDER BY gr.created_at DESC
  `, [req.user.id], (err, gameHistory) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // For each game, get the participants to show teams
    const getGameParticipants = (gameId) => {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            u.id,
            u.username,
            u.age,
            gr.result,
            gr.score
          FROM game_participants gp
          JOIN users u ON gp.user_id = u.id
          LEFT JOIN game_results gr ON gr.game_id = gp.game_id AND gr.user_id = gp.user_id
          WHERE gp.game_id = ?
          ORDER BY gr.result DESC, u.username
        `, [gameId], (err, participants) => {
          if (err) reject(err);
          else resolve(participants);
        });
      });
    };
    
    // Get participants for each game
    Promise.all(gameHistory.map(game => 
      getGameParticipants(game.game_id).then(participants => ({
        ...game,
        participants
      }))
    )).then(gamesWithParticipants => {
      res.json(gamesWithParticipants);
    }).catch(err => {
      res.status(500).json({ error: 'Database error' });
    });
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Store user info for chat messages
  socket.userId = null;
  socket.username = null;
  
  socket.on('joinGameRoom', (data) => {
    const { gameId, userId, username } = data;
    socket.userId = userId;
    socket.username = username;
    socket.join(gameId);
    console.log(`User ${username} (${userId}) joined game room: ${gameId}`);
  });
  
  socket.on('leaveGameRoom', (gameId) => {
    socket.leave(gameId);
    console.log(`User ${socket.username} left game room: ${gameId}`);
  });
  
  socket.on('sendMessage', async (data) => {
    const { gameId, message } = data;
    
    if (!socket.userId || !message || !message.trim()) {
      return;
    }
    
    try {
      // Save message to database
      const messageId = uuidv4();
      db.run(
        'INSERT INTO chat_messages (id, game_id, user_id, message) VALUES (?, ?, ?, ?)',
        [messageId, gameId, socket.userId, message.trim()],
        function(err) {
          if (err) {
            console.error('Error saving chat message:', err);
            return;
          }
          
          // Broadcast message to all users in the game room
          io.to(gameId).emit('newMessage', {
            id: messageId,
            message: message.trim(),
            user_id: socket.userId,
            username: socket.username,
            created_at: new Date().toISOString()
          });
        }
      );
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Catch-all handler: send back React's index.html for any non-API route.
// When the backend is deployed on its own (no client build present — the common
// case for the native app, which bundles its own web assets), respond with JSON
// instead of crashing on a missing file.
const indexHtmlPath = path.join(__dirname, '../client/build/index.html');
app.get('*', (req, res) => {
  res.sendFile(indexHtmlPath, (err) => {
    if (err) {
      res.status(200).json({
        message: 'Pick Up API is running. The web client is not bundled with this deployment.',
        health: '/api/health'
      });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Accessible at http://localhost:${PORT} and http://YOUR_IP:${PORT}`);
}); 