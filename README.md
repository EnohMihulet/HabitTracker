Habit Tracker API

SO FAR: A backend API for tracking habits, logging completions, and calculating streaks. Built with Node.js, Express, SQLite, and JWT authentication.

Features
- User registration and login with hashed passwords (bcrypt)
- JWT authentication
- Create, read, update, delete habits
- Log habit completions (with backlogging)
- Calculate streaks based on consecutive logs

Stack
- Node.js
- Express
- SQLite
- JWT Authentication
- bcrypt

Setup
1. Clone the repo
2. Run `npm install`
3. Create a `.env` file with:
    PORT=3000
    JWT_SECRET=your_key
4. Start the server: npm run dev