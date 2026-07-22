const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./pickup.db');

// Sample locations around a central point (you can change these to your area)
const baseLat = 40.7128; // Example: NYC coordinates
const baseLng = -74.0060;

// Helper function to generate random coordinates within a radius
function randomLocation(centerLat, centerLng, radiusKm) {
  const radiusInDegrees = radiusKm / 111; // Rough conversion
  const randomLat = centerLat + (Math.random() - 0.5) * radiusInDegrees * 2;
  const randomLng = centerLng + (Math.random() - 0.5) * radiusInDegrees * 2;
  return { lat: randomLat, lng: randomLng };
}

// Sample data
const fakeUsers = [
  { username: 'baller23', email: 'baller@test.com', age: 25, favorite_sport: 'basketball', location: 'Downtown Court' },
  { username: 'soccer_pro', email: 'soccer@test.com', age: 28, favorite_sport: 'soccer', location: 'Central Park' },
  { username: 'baseball_mike', email: 'mike@test.com', age: 22, favorite_sport: 'baseball', location: 'Riverside Field' },
  { username: 'softball_sarah', email: 'sarah@test.com', age: 26, favorite_sport: 'softball', location: 'Community Center' },
  { username: 'hoops_master', email: 'hoops@test.com', age: 24, favorite_sport: 'basketball', location: 'Park Avenue' },
  { username: 'striker99', email: 'striker@test.com', age: 27, favorite_sport: 'soccer', location: 'Sports Complex' },
  { username: 'diamond_dave', email: 'dave@test.com', age: 29, favorite_sport: 'baseball', location: 'Memorial Field' },
  { username: 'court_queen', email: 'queen@test.com', age: 23, favorite_sport: 'basketball', location: 'High School Gym' },
];

const sports = ['baseball', 'basketball', 'soccer', 'softball'];
const levels = ['A', 'B', 'C'];
const gameTitles = [
  'Evening Pickup Game',
  'Weekend Tournament',
  'After Work Session',
  'Saturday Morning Run',
  'Sunday League',
  'Quick Game',
  'Friendly Match',
  'Competitive Play',
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  // Hash password for all test users
  const hashedPassword = await bcrypt.hash('test123', 10);
  const userIds = [];

  // Create fake users
  console.log('Creating test users...');
  for (const user of fakeUsers) {
    const userId = uuidv4();
    userIds.push(userId);
    const loc = randomLocation(baseLat, baseLng, 5); // Within 5km
    
    db.run(
      `INSERT OR IGNORE INTO users (id, username, email, password, age, location, current_location, current_location_lat, current_location_lng, home_location, home_location_lat, home_location_lng, favorite_sport) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, user.username, user.email, hashedPassword, user.age, user.location, user.location, loc.lat, loc.lng, user.location, loc.lat, loc.lng, user.favorite_sport],
      function(err) {
        if (err && !err.message.includes('UNIQUE')) {
          console.error(`Error creating user ${user.username}:`, err);
        } else if (!err) {
          console.log(`✓ Created user: ${user.username}`);
        }
      }
    );
  }

  // Wait a bit for users to be created
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create fake games
  console.log('\nCreating test games...');
  const gameIds = [];
  
  for (let i = 0; i < 12; i++) {
    const gameId = uuidv4();
    gameIds.push(gameId);
    const creatorId = userIds[Math.floor(Math.random() * userIds.length)];
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const title = gameTitles[Math.floor(Math.random() * gameTitles.length)];
    const maxPlayers = [4, 6, 8, 10, 12][Math.floor(Math.random() * 5)];
    const loc = randomLocation(baseLat, baseLng, 10); // Within 10km
    
    // Create game time (some today, some tomorrow, some next week)
    const daysOffset = Math.floor(Math.random() * 7);
    const hours = 17 + Math.floor(Math.random() * 5); // 5pm to 9pm
    const gameDate = new Date();
    gameDate.setDate(gameDate.getDate() + daysOffset);
    gameDate.setHours(hours, 0, 0, 0);
    const gameTime = gameDate.toISOString();

    db.run(
      `INSERT INTO games (id, title, sport, location, location_lat, location_lng, max_players, creator_id, game_time, level, status, is_casual, is_private, min_age) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 0, ?)`,
      [gameId, `${title} - ${sport}`, sport, `${sport} Field ${i + 1}`, loc.lat, loc.lng, maxPlayers, creatorId, gameTime, level, Math.random() > 0.5 ? 1 : 0, 18],
      function(err) {
        if (err) {
          console.error(`Error creating game ${i + 1}:`, err);
        } else {
          console.log(`✓ Created game: ${title} - ${sport} (${level})`);
          
          // Add creator as participant
          db.run(
            'INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
            [gameId, creatorId]
          );
          
          // Add random participants (1-3 additional players)
          const numParticipants = Math.floor(Math.random() * 3) + 1;
          const availableUsers = userIds.filter(id => id !== creatorId);
          const shuffled = availableUsers.sort(() => 0.5 - Math.random());
          const participants = shuffled.slice(0, Math.min(numParticipants, maxPlayers - 1));
          
          participants.forEach(userId => {
            db.run(
              'INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
              [gameId, userId]
            );
          });
        }
      }
    );
  }

  // Wait for games to be created
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create some friend relationships
  console.log('\nCreating friend relationships...');
  for (let i = 0; i < 5; i++) {
    const user1 = userIds[Math.floor(Math.random() * userIds.length)];
    const user2 = userIds[Math.floor(Math.random() * userIds.length)];
    
    if (user1 !== user2) {
      db.run(
        'INSERT OR IGNORE INTO friends (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)',
        [uuidv4(), user1, user2, 'accepted'],
        function(err) {
          if (err && !err.message.includes('UNIQUE')) {
            console.error('Error creating friend relationship:', err);
          }
        }
      );
    }
  }

  // Create some pending friend requests
  for (let i = 0; i < 3; i++) {
    const user1 = userIds[Math.floor(Math.random() * userIds.length)];
    const user2 = userIds[Math.floor(Math.random() * userIds.length)];
    
    if (user1 !== user2) {
      db.run(
        'INSERT OR IGNORE INTO friends (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)',
        [uuidv4(), user1, user2, 'pending'],
        function(err) {
          if (err && !err.message.includes('UNIQUE')) {
            console.error('Error creating pending request:', err);
          }
        }
      );
    }
  }

  // Add some chat messages to a few games
  console.log('\nAdding chat messages...');
  const gamesWithChat = gameIds.slice(0, 3);
  
  gamesWithChat.forEach(gameId => {
    db.all('SELECT user_id FROM game_participants WHERE game_id = ?', [gameId], (err, participants) => {
      if (!err && participants.length > 0) {
        const messages = [
          'Hey, looking forward to this game!',
          'What time should we meet?',
          'See you there!',
          'Anyone bringing a ball?',
          'Weather looks good!',
        ];
        
        participants.forEach((participant, index) => {
          if (index < messages.length) {
            db.run(
              'INSERT INTO chat_messages (id, game_id, user_id, message) VALUES (?, ?, ?, ?)',
              [uuidv4(), gameId, participant.user_id, messages[index]]
            );
          }
        });
      }
    });
  });

  console.log('\n✅ Database seeding complete!');
  console.log('\nTest accounts created:');
  fakeUsers.forEach(user => {
    console.log(`  Username: ${user.username} | Email: ${user.email} | Password: test123`);
  });
  console.log('\nYou can now log in with any of these accounts to test the app!');
  
  db.close();
}

seedDatabase().catch(console.error);

