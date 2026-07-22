const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./pickup.db');

const gameId = 'f8e3390c-74c1-4a16-819c-fc4d254260a4'; // Game "name"
const userIds = [
  '3d1576e7-6308-4845-983d-4d372126e6d6',
  '3d7a0a1d-c455-4fcc-ab50-4550476b2210',
  '41638c76-c7ea-4280-8459-9a16ba2331f0',
  '41b721ca-fc6c-4989-abe6-66598d69ee20',
  '631fb06f-04b2-4c50-aa0f-8607c17d4c0b',
  '73f48ac3-b707-4af0-b2f5-51ddb19acd0f',
  '95c1a067-e7fb-4603-b9cb-16cdca657451',
  'a9f5b1dc-17fa-4d97-86c1-0827bf3ded0b',
  'ae00ea10-6dd4-4117-ac77-05d31a1690d6'
];

console.log('Adding participants to game "name"...\n');

let added = 0;
let errors = 0;

userIds.forEach((userId, index) => {
  db.run(
    'INSERT OR IGNORE INTO game_participants (game_id, user_id) VALUES (?, ?)',
    [gameId, userId],
    function(err) {
      if (err) {
        console.error(`Error adding user ${index + 1}:`, err);
        errors++;
      } else if (this.changes > 0) {
        added++;
        console.log(`✓ Added participant ${added}/9`);
      }
      
      // Check if we're done
      if (added + errors === userIds.length) {
        db.get(
          'SELECT COUNT(*) as count FROM game_participants WHERE game_id = ?',
          [gameId],
          (err, result) => {
            if (!err) {
              console.log(`\n✅ Game "name" now has ${result.count} participants!`);
            }
            db.close();
          }
        );
      }
    }
  );
});

