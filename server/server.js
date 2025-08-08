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
    frequency TEXT NOT NULL, 
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
    const user_id = req.user.id;
    const {name, frequency} = req.body;

    if (!name || !frequency) {
        return res.status(400).json({error: "name, and frequency are required"});
    }

    const query = `INSERT INTO habits (user_id, name, frequency) VALUES (?, ?, ?)`;
    db.run(query, [user_id, name, frequency], (err) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.status(201).json({message: "Habit created successfully", habitID: this.lastID});
    });
});

app.get("/habits", authenticateToken, (req, res) => {    
    const query = `SELECT * FROM habits WHERE user_id = ?`;
    db.all(query, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json(rows);
    });
});

app.put("/habits/:id", (authenticateToken, req, res) => {
    const {id} = req.params;
    const {name, frequency} = req.body;

    if (!name || !frequency) {
        return res.status(400).json({error: "name and frequency required"});
    }

    const query = `UPDATE habits SET name = ?, frequency = ? WHERE id = ?`;
    db.run(query, [name, frequency, id], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (this.changes === 0) {
            return  res.status(404).json({error: "Habit not found"});
        }
        res.json({message: "Habit upated successfully"});
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
    const habit_id = req.params.id;

    const query = `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`;
    db.all(query, [habit_id], (err, logs) => {
        if (!logs || logs.length === 0) {
            return res.json({streak: 0});
        }

        let streak = 1;
        for (let i = 1; i < logs.length; i++) {
            let prev = new Date(logs[i - 1].date);
            let curr = new Date(logs[i].date);
            let diffDays = (prev - curr) / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        return res.json({streak});
    })
});

app.post("/habits/:id/log", authenticateToken, (req, res) => {
    const habit_id = req.params.id;
    let {date} = req.body;

    if (!date) {
        const today = new Date();
        date = today.toISOString().split("T")[0];
    }

    if (!habit_id) {
        return res.status(400).json({error: "habit_id is required"});
    } 

    const query = `INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)`;
    db.run(query, [habit_id, date], function (err) {
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

app.get("/habits/:id/logs", authenticateToken, (req, res) => {
    const habit_id = req.params.id;
    
    if (!habit_id) {
        return res.status(400).json({error: "habit_id is required"});
    }

    const query = `SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`
    db.all(query, [habit_id], (err, logs) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        return res.json({logs})
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