Habit Tracker
    - A full-stack habit tracking web app to help users build consistency and visualize progress.
    -  Track habits, log completions, and see streaks at a glance with a heatmap.

Authentication
    - Secure user registration and login
    - Passwords hashed with bcrypt
    - JWT-based authentication for protected routes

Habits
    - Create, read, update, and delete habits
    - Configure frequency: daily, weekly, or custom times per week

Habit Logs
    - Log completions
    - Prevent duplicate logs per habit per day

Streaks
    - Automatic streak calculation based on habit frequency
    - Visual indicator for current streaks

Heatmap
    - 13-week grid (GitHub-style) showing completed days
    - Dynamic month labels aligned with calendar
    - Hover tooltips to view exact dates


Stack
    Backend (/server)
    - Node.js
    - Express
    - SQLite
    - JWT
    - bcrypt
    - dotenv

    Frontend (/frontend)
    - Next.js
    - React
    - Tailwind