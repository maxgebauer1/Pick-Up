const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./pickup.db');

async function seedGameResults() {
  console.log('🏆 Adding game results for leaderboard...\n');

  // First, get all users
  const users = await new Promise((resolve, reject) => {
    db.all('SELECT id, username FROM users', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  if (users.length === 0) {
    console.log('No users found. Please run seed.js first.');
    db.close();
    return;
  }

  console.log(`Found ${users.length} users\n`);

  // Create completed games with results for leaderboard
  const sports = ['basketball', 'soccer', 'baseball', 'softball'];
  const levels = ['A', 'B'];
  const gamesPerUser = 10; // Each user will play in ~10 games

  const completedGames = [];

  // Create 30 completed games
  for (let i = 0; i < 30; i++) {
    const gameId = uuidv4();
    const creatorId = users[Math.floor(Math.random() * users.length)].id;
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const maxPlayers = [4, 6, 8, 10][Math.floor(Math.random() * 4)];
    const isMoneyGame = Math.random() > 0.7; // 30% chance of money game
    const entryFee = isMoneyGame ? [10, 20, 50, 100][Math.floor(Math.random() * 4)] : 0;

    // Create game in the past
    const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 days ago
    const gameDate = new Date();
    gameDate.setDate(gameDate.getDate() - daysAgo);
    const gameTime = gameDate.toISOString();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO games (id, title, sport, location, location_lat, location_lng, max_players, creator_id, game_time, level, status, is_casual, is_private, min_age, is_money_game, entry_fee, total_pot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, 0, ?, ?, ?, ?)`,
        [
          gameId,
          `${sport} Match #${i + 1}`,
          sport,
          `${sport} Court ${i + 1}`,
          40.7128 + (Math.random() - 0.5) * 0.1,
          -74.0060 + (Math.random() - 0.5) * 0.1,
          maxPlayers,
          creatorId,
          gameTime,
          level,
          Math.random() > 0.5 ? 1 : 0,
          18,
          isMoneyGame ? 1 : 0,
          entryFee,
          entryFee * maxPlayers
        ],
        function (err) {
          if (err) reject(err);
          else {
            console.log(`✓ Created completed game: ${sport} - ${level} ${isMoneyGame ? '💰' : ''}`);
            resolve();
          }
        }
      );
    });

    // Add participants to the game
    const numParticipants = Math.min(maxPlayers, Math.floor(Math.random() * (maxPlayers - 2)) + 4);
    const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
    const gameParticipants = shuffledUsers.slice(0, numParticipants);

    for (const participant of gameParticipants) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)',
          [gameId, participant.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Generate random scores
    const homeScore = Math.floor(Math.random() * 50) + 30;
    const awayScore = Math.floor(Math.random() * 50) + 30;
    const homeWon = homeScore > awayScore;
    const isTie = homeScore === awayScore;

    // Create game results for each participant
    for (let j = 0; j < gameParticipants.length; j++) {
      const participant = gameParticipants[j];
      const isHomeTeam = j % 2 === 0;
      let result = 'tie';

      if (!isTie) {
        if (isHomeTeam) {
          result = homeWon ? 'win' : 'loss';
        } else {
          result = homeWon ? 'loss' : 'win';
        }
      }

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO game_results (id, game_id, user_id, result, score) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), gameId, participant.id, result, isHomeTeam ? homeScore : awayScore],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    completedGames.push({
      gameId,
      level,
      isMoneyGame,
      entryFee,
      participants: gameParticipants,
    });
  }

  console.log(`\n✅ Created ${completedGames.length} completed games with results!`);

  // Get and display leaderboard stats
  console.log('\n📊 Leaderboard Preview (League A):');
  const leaderboardA = await new Promise((resolve, reject) => {
    db.all(
      `SELECT
        u.username,
        COUNT(gr.id) as total_games,
        SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN gr.result = 'loss' THEN 1 ELSE 0 END) as losses,
        ROUND((SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(gr.id), 0), 2) as win_percentage
      FROM users u
      JOIN game_results gr ON u.id = gr.user_id
      JOIN games g ON gr.game_id = g.id
      WHERE g.level = 'A' AND g.status = 'completed'
      GROUP BY u.id, u.username
      HAVING total_games >= 3
      ORDER BY win_percentage DESC, total_games DESC
      LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  leaderboardA.forEach((player, index) => {
    console.log(
      `${index + 1}. ${player.username} - ${player.total_games} games, ${player.wins}W-${player.losses}L (${player.win_percentage}%)`
    );
  });

  console.log('\n📊 Leaderboard Preview (League B):');
  const leaderboardB = await new Promise((resolve, reject) => {
    db.all(
      `SELECT
        u.username,
        COUNT(gr.id) as total_games,
        SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN gr.result = 'loss' THEN 1 ELSE 0 END) as losses,
        ROUND((SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(gr.id), 0), 2) as win_percentage
      FROM users u
      JOIN game_results gr ON u.id = gr.user_id
      JOIN games g ON gr.game_id = g.id
      WHERE g.level = 'B' AND g.status = 'completed'
      GROUP BY u.id, u.username
      HAVING total_games >= 3
      ORDER BY win_percentage DESC, total_games DESC
      LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  leaderboardB.forEach((player, index) => {
    console.log(
      `${index + 1}. ${player.username} - ${player.total_games} games, ${player.wins}W-${player.losses}L (${player.win_percentage}%)`
    );
  });

  console.log('\n💰 Money Games Leaderboard Preview:');
  const moneyLeaderboard = await new Promise((resolve, reject) => {
    db.all(
      `SELECT
        u.username,
        COUNT(gr.id) as money_games_played,
        SUM(CASE WHEN gr.result = 'win' THEN g.entry_fee ELSE 0 END) as total_earnings,
        SUM(CASE WHEN gr.result = 'loss' THEN g.entry_fee ELSE 0 END) as total_losses,
        ROUND((SUM(CASE WHEN gr.result = 'win' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(gr.id), 0), 2) as win_percentage
      FROM users u
      JOIN game_results gr ON u.id = gr.user_id
      JOIN games g ON gr.game_id = g.id
      WHERE g.is_money_game = 1 AND g.status = 'completed'
      GROUP BY u.id, u.username
      HAVING money_games_played >= 1
      ORDER BY total_earnings DESC, win_percentage DESC
      LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  moneyLeaderboard.forEach((player, index) => {
    console.log(
      `${index + 1}. ${player.username} - $${player.total_earnings} earned (${player.money_games_played} games, ${player.win_percentage}% win rate)`
    );
  });

  console.log('\n✅ All done! Check the leaderboard in the app!');

  db.close();
}

seedGameResults().catch(console.error);
