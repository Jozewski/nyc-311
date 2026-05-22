const Database = require('better-sqlite3');
const path = require('path');
 
// ── Path to your database file ───────────────────────────────────────────────
// Place nyc_311_2023.db in the server/ folder, or update this path.
const DB_PATH = path.join(__dirname, 'nyc_311_2023.db');
 
let db;
 
function getDb() {
  if (!db) {
    try {
      db = new Database(DB_PATH, { readonly: true });
      console.log('✅ Connected to nyc_311_2023.db');
    } catch (err) {
      console.error('❌ Could not open database:', err.message);
      console.error('   Expected location:', DB_PATH);
      process.exit(1);
    }
  }
  return db;
}
 
module.exports = { getDb };