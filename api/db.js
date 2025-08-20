const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_DIR = process.env.DB_DIR || "/tmp";
const DB_FILE = process.env.DB_FILE || "habit-tracker.db";
const dbFile = path.join(DB_DIR, DB_FILE);

fs.mkdirSync(DB_DIR, { recursive: true });
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error("Failed to connect to database:", err.message);
    else console.log("Connected to SQLite database:", dbFile);
});

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");
    db.run("PRAGMA journal_mode = WAL;");

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        frequency_type TEXT NOT NULL CHECK(frequency_type IN ('daily','weekly','custom')),
        times_per_week INTEGER NOT NULL CHECK(times_per_week BETWEEN 1 AND 7),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status TEXT DEFAULT 'completed',
        FOREIGN KEY (habit_id) REFERENCES habits (id),
        UNIQUE (habit_id, date)
    )`);
});

module.exports = db;