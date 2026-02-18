const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/chatgrd.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gardens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    garden_type TEXT NOT NULL,
    location_city TEXT,
    location_state TEXT,
    hardiness_zone TEXT,
    width_ft REAL,
    length_ft REAL,
    sun_exposure TEXT DEFAULT 'full_sun',
    has_fencing INTEGER DEFAULT 0,
    irrigation_type TEXT DEFAULT 'hand',
    notes TEXT,
    photo_path TEXT,
    layout_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS garden_plants (
    id TEXT PRIMARY KEY,
    garden_id TEXT NOT NULL,
    plant_id TEXT NOT NULL,
    x_position REAL DEFAULT 0,
    y_position REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE,
    FOREIGN KEY (plant_id) REFERENCES plants(id)
  );

  CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scientific_name TEXT,
    category TEXT,
    emoji TEXT,
    min_zone INTEGER DEFAULT 1,
    max_zone INTEGER DEFAULT 13,
    spacing_inches INTEGER DEFAULT 12,
    days_to_maturity INTEGER,
    sun_requirement TEXT DEFAULT 'full_sun',
    water_needs TEXT DEFAULT 'moderate',
    garden_types TEXT DEFAULT 'all',
    companions TEXT,
    antagonists TEXT,
    description TEXT,
    planting_tips TEXT,
    height_inches INTEGER DEFAULT 12,
    color TEXT DEFAULT '#4ade80'
  );

  CREATE TABLE IF NOT EXISTS nli_conversations (
    id TEXT PRIMARY KEY,
    garden_id TEXT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;
