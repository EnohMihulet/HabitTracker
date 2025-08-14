const express = require("express");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use(express.json());

const db = new sqlite3.Database("./habit-tracker.db", (err) => {
    if (err) { console.error("Failed to connect to database:", err.message); }
    else { console.log("Connected to SQLite database."); }
});

app.get("/", (req, res) => {
    res.send("Habit Tracker API is running");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username TEXT UNIQUE NOT NULL, 
    password TEXT NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

db.run(`CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER NOT NULL, name TEXT NOT NULL,
    frequency_type TEXT NOT NULL CHECK(frequency_type IN ('daily','weekly','custom')),
    times_per_week INTEGER NOT NULL CHECK(times_per_week BETWEEN 1 AND 7),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (user_id) REFERENCES users (id))`);

db.run(`CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'completed',
    FOREIGN KEY (habit_id) REFERENCES habits (id),
    UNIQUE (habit_id, date))`);

app.post("/register", async (req, res) => {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({error: "Username and password are required"});
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
        db.run(query, [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({error: "Username already exists"});
                }
                return res.status(500).json({error: err.message });
            }
            res.status(201).json({message: "User registered successfully", userID: this.lastID });
        });
    } catch (error) {
        res.status(500).json({error: "Server error" });
    }
});

app.post("/login", (req, res) => {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({error: "Username and password are required"});
    }

    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }

        if (!user) {
            return res.status(400).json({error: "Invalid username or password"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({error: "Invalid username or password"});
        }

        const token = jwt.sign(
            {id: user.id, username: user.username},
            process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );

        res.json({message: "Login successful", token});
    })
});

app.post("/habits", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const {name, frequencyType, timesPerWeek} = req.body;

    if (!name || !frequencyType || !timesPerWeek) {
        return res.status(400).json({error: "name, and frequency are required"});
    }

    const query = `INSERT INTO habits (user_id, name, frequency_type, times_per_week) VALUES (?, ?, ?, ?)`;
    db.run(query, [userId, name, frequencyType, timesPerWeek], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.status(201).json({message: "Habit created successfully", habitID: this.lastID});
    });
});

app.get("/habits", authenticateToken, (req, res) => {    
    const query = `SELECT * FROM habits WHERE user_id = ?`;
    db.all(query, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows.map(toCamelCase));
    });
});

app.put("/habits/:id", authenticateToken, (req, res) => {
    const {id} = req.params;
    const {name, frequencyType, timesPerWeek} = req.body;

    if (!name || !frequencyType || !timesPerWeek) {
        return res.status(400).json({error: "name and frequency required"});
    }

    const query = `UPDATE habits SET name = ?, frequency_type = ?, times_per_week = ? WHERE id = ?`;
    db.run(query, [name, frequencyType, timesPerWeek, id], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (this.changes === 0) {
            return  res.status(404).json({error: "Habit not found"});
        }
        res.json({message: "Habit updated successfully"});
    });
});

app.delete("/habits/:id", authenticateToken, (req, res) => {
    const {id} = req.params;

    const query = `DELETE FROM habits WHERE id = ?`;
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (this.changes === 0) {
            return res.status(404).json({error: "Habit not found"});
        }
        res.json({message: "Habit deleted successfully"});
    })
});

app.get("/habits/:id/streak", authenticateToken, (req, res) => {
    const habitId = req.params.id;
  
    const dateQuery = `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
    db.all(dateQuery, [habitId], (err, logs) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!logs || logs.length === 0) return res.json({ streak: 0 });
  
      const freqQuery = `SELECT frequency_type, times_per_week FROM habits WHERE id = ?`;
      db.get(freqQuery, [habitId], (err2, freqData) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (!freqData) return res.status(404).json({ error: "Habit not found" });
  
        const datesDesc = logs.map(l => l.date); // strings like "YYYY-MM-DD"
        const streak = calcStreak(freqData.frequency_type, freqData.times_per_week, datesDesc);
        return res.json({ streak });
      });
    });
  });
  
  app.get("/habits/streaks", authenticateToken, (req, res) => {
    const query = `SELECT * FROM habits WHERE user_id = ?`;
    db.all(query, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows || rows.length === 0) return res.json([]);
  
      // If you want camelCase fields:
      let habits = rows.map(toCamelCase); // now use .frequencyType and .timesPerWeek
      const today = new Date().toISOString().split("T")[0];
      let completedCount = 0;
  
      habits.forEach((habit, index) => {
        const logQuery = `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
        db.all(logQuery, [habit.id], (err2, logs) => {
          if (err2 || !logs || logs.length === 0) {
            habits[index].streak = 0;
            habits[index].completed = false;
          } else {
            const datesDesc = logs.map(l => l.date);
            habits[index].streak = calcStreak(habit.frequencyType, habit.timesPerWeek, datesDesc);
            const latestDate = logs[0].date;
            habits[index].completed = latestDate === today;
          }
  
          completedCount++;
          if (completedCount === habits.length) {
            return res.json(habits);
          }
        });
      });
    });
  });

app.post("/habits/:id/log", authenticateToken, (req, res) => {
    const habitId = req.params.id;
    let {date} = req.body || {};

    if (!habitId) {
        return res.status(400).json({error: "habit_id is required"});
    } 

    if (!date) {
        date = new Date().toISOString().split("T")[0];
    }

    const query = `INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)`;
    db.run(query, [habitId, date], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                return res.status(400).json({error: "Habit already logged for this date"});
            }
            return res.status(500).json({error: err.message});
        }

        res.status(201).json({
            message: "Habit logged successfully",
            logID: this.lastID,
            date
        });
    });
});

app.delete("/habits/:id/log", authenticateToken, (req, res) => {
    const habitID = req.params.id;
    let {date} = req.body || {};

    if (!habitID) {
        return res.status(400).json({error: "habit_id is required"});
    }

    if (!date) {
        date = new Date().toISOString().split("T")[0];
    }

    const query = `DELETE FROM habit_logs WHERE habit_id = ? AND date = ?`;
    db.run(query, [habitID, date], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Log not found for that habit"});
        }

        res.status(200).json({ message: "Habit deleted successfully"});
    })
})

app.get("/habits/:id/logs", authenticateToken, (req, res) => {
    const habitId = req.params.id;
    if (!habitId) return res.status(400).json({error: "habit_id is required"});

    const query = `SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
    db.all(query, [habitId], (err, logs) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({logs: logs.map(toCamelCase)});
    });
});


function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({error: "Access denied, token missing"});
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
        return res.status(401).json({error: "Invalid or expired token"});
        }

        req.user = user;
        next();
    });
}

function toUTC(d) { return  new Date(d + "T00:00:00z"); }
function daysBetween(a, b) { return Math.round((toUTC(a) - toUTC(b)) / 86400000); }

function calcStreak(freqType, timesPerWeek, dateStringsDesc) {
    if (!dateStringsDesc || dateStringsDesc.length === 0) return 0;
    const len = dateStringsDesc.length;

    if (freqType === "daily") {
        let streak = 1;
        for (let i = 1; i < len; i++) {
            const prev = dateStringsDesc[i - 1];
            const curr = dateStringsDesc[i];
            if (daysBetween(prev, curr) === 1) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    } 
    else if (freqType === "weekly") {
        let streak = 1;
        const curr = dateStringsDesc[0];
        for (let i = 1; i < len; i++) {
            const prev = dateStringsDesc[i];
            const diff = daysBetween(prev, curr);
            if (diff > (i - 1) * 7 && diff <= i * 7) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    } 
    else if (freqType === "custom") {
        let streak = 0;
        let daysThisWeek = 1;

        const dayOfWeek = toUTC(dateStringsDesc[0]).getDay();
        let i = 1;

        if (dayOfWeek < timesPerWeek) {
            while (i < len) {
                const prev = dateStringsDesc[i - 1];
                const curr = dateStringsDesc[i];
                daysThisWeek += daysBetween(prev, curr);
                if (daysThisWeek >= dayOfWeek) break;
                i++;
            }
        }

        daysThisWeek = 1;
        let daysPassed = 1;

        for (; i < len; i++) {
            const prev = dateStringsDesc[i - 1];
            const curr = dateStringsDesc[i];
            daysThisWeek++;
            daysPassed += daysBetween(prev, curr);

            if (daysPassed < 7) continue;

            if (daysThisWeek >= timesPerWeek) {
                streak++;
            } else {
                return streak;
            }

            daysThisWeek = 1;
            daysPassed = 0;
        }

        return streak;
    }
}

function toCamelCase(row) {
    const newRow = {};
    for (const key in row) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      newRow[camelKey] = row[key];
    }
    return newRow;
  }