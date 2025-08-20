const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const db = require("./db");
const { calcStreak } = require("./utils/streak");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(express.json());

const allowOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowOrigin, credentials: true }));

app.set("trust proxy", 1);

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.get("/", (_req, res) => {
    res.send("Habit Tracker API is running");
});

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
    const habitID = req.params.id;
  
    const dateQuery = `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
    db.all(dateQuery, [habitID], (err, logs) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!logs || logs.length === 0) return res.json({ streak: 0 });
  
        const freqQuery = `SELECT frequency_type, times_per_week FROM habits WHERE id = ?`;
        db.get(freqQuery, [habitID], (err2, freqData) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!freqData) return res.status(404).json({ error: "Habit not found" });
  
            const datesDesc = logs.map(l => l.date);
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
  
        let habits = rows.map(toCamelCase);
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
                    if (habit.frequencyType === "daily" && logs[0].date != today) {
                        habits[index].streak = 0;
                    } else {
                        habits[index].streak = calcStreak(habit.frequencyType, habit.timesPerWeek, datesDesc);
                    }
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
    const habitID = req.params.id;
    let { date } = req.body || {};

    if (!habitID) return res.status(400).json({ error: "habit_id is required" });
    if (!date) date = new Date().toISOString().slice(0, 10);
  
    const insertQuery = `INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)`;
    db.run(insertQuery, [habitID, date], function (err) {
        const computeAndReturn = () => {
        const dateQuery = `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
        db.all(dateQuery, [habitID], (err2, logs) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const logID = !err ? this.lastID : null;

            if (!logs || logs.length === 0) return res.json({ logID, date, newStreak: 0 });
  
            const freqQuery = `SELECT frequency_type, times_per_week FROM habits WHERE id = ?`;
            db.get(freqQuery, [habitID], (err3, freqData) => {
                if (err3) return res.status(500).json({ error: err3.message });
                if (!freqData) return res.status(404).json({ error: "Habit not found" });
  
                const datesDesc = logs.map(l => l.date);
                const newStreak = calcStreak(freqData.frequency_type, freqData.times_per_week, datesDesc);
                return res.json({ logID, date, newStreak });
                });
            });
        };
  
        if (err) {
            if (err.message.includes("UNIQUE")) {
                return computeAndReturn();
            }
            return res.status(500).json({ error: err.message });
        }
        computeAndReturn();
    });
});

app.delete("/habits/:id/log", authenticateToken, (req, res) => {
    const habitID = req.params.id;
    let { date } = req.body || {};
    if (!habitID) return res.status(400).json({ error: "habit_id is required" });
    if (!date) date = new Date().toISOString().slice(0, 10);

    const delQuery = `DELETE FROM habit_logs WHERE habit_id = ? AND date = ?`;
    db.run(delQuery, [habitID, date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Log not found for that habit" });

        const dateQuery = `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
        db.all(dateQuery, [habitID], (err2, logs) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!logs || logs.length === 0) return res.json({ newStreak: 0 });

            const freqQuery = `SELECT frequency_type, times_per_week FROM habits WHERE id = ?`;
            db.get(freqQuery, [habitID], (err3, freqData) => {
                if (err3) return res.status(500).json({ error: err3.message });
                if (!freqData) return res.status(404).json({ error: "Habit not found" });

                const datesDesc = logs.map(l => l.date);

                const today = new Date().toISOString().split("T")[0];
                if (freqData.frequency_type == "daily" && logs[0].date != today) return res.json({ newStreak: 0});
                const newStreak = calcStreak(freqData.frequency_type, freqData.times_per_week, datesDesc);
                return res.json({ newStreak });
            });
        });
    });
});

app.get("/habits/:id/logs", authenticateToken, (req, res) => {
    const habitID = req.params.id;
    if (!habitID) return res.status(400).json({error: "habit_id is required"});

    const query = `SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
    db.all(query, [habitID], (err, logs) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({logs: logs.map(toCamelCase)});
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
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

function toCamelCase(row) {
    const newRow = {};
    for (const key in row) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        newRow[camelKey] = row[key];
    }
    return newRow;
}