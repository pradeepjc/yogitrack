# YogiTrack

Phase 1 (in progress): Manager & Instructor record-keeping for Yoga H'om studio.
Implemented so far: **UC1 (Add Instructor)**, **UC2 (Add Class)**, **UC3 (Add Package)**, **UC4 (Add Customer)**, **UC5a (Record a Sale)**, and **UC5b (Record Class Attendance)**. Reports are planned but not yet built.

## Stack
MongoDB + Express + React (Vite) + Node, JWT-based auth with Manager and Instructor roles.

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (or update `MONGO_URI`)

### Backend
```
cd backend
cp .env.example .env   # defaults to port 5050 (macOS AirPlay Receiver uses 5000)
npm install
npm run seed            # creates the first Manager login (manager / manager123 by default)
npm run dev
```

### Frontend
```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit http://localhost:5173 and log in with the seeded manager credentials.

## Notes
- Notifications (welcome messages, class-scheduled confirmations) are **mocked**: they're written to the `notifications` collection and logged to the backend console instead of being sent via a real email/SMS provider.
- Instructors log in with their instructor id as both username and password (e.g. `I00003` / `I00003`). Accounts are created automatically when a manager adds an instructor; for instructors added before this existed, run `npm run accounts:instructors` in `backend` once (on Heroku: `heroku run npm run accounts:instructors --prefix backend`).
- Attendance times are read in the studio's time zone, set by `STUDIO_TIMEZONE` (default `America/Chicago`).
- Class scheduling assumes a single studio: only one class can run at a time (a 60-minute default duration is used for overlap checks). Conflicting submissions get alternative-slot suggestions.

## Deployment (Heroku)

This deploys as a **single Heroku app**: the Express backend serves both the API (`/api/*`) and the built React frontend (everything else) from one dyno/URL.

### One-time setup
1. **Create a MongoDB Atlas cluster** (free tier) at mongodb.com — Heroku dynos have no local disk/DB, and Heroku's old Mongo add-ons are discontinued. Get a connection string (`mongodb+srv://...`), with a database user and IP access set to allow from anywhere (`0.0.0.0/0`) since Heroku dynos have no fixed IP.
2. From the repo root:
   ```
   heroku create <your-app-name>
   heroku config:set MONGO_URI="<your Atlas connection string>"
   heroku config:set JWT_SECRET="<a long random string>"
   heroku config:set SEED_MANAGER_USERNAME=manager
   heroku config:set SEED_MANAGER_PASSWORD="<a real password, not the local default>"
   ```
3. Deploy:
   ```
   git push heroku main
   ```
   The root `package.json`'s `heroku-postbuild` script installs both `backend`/`frontend` dependencies and runs `vite build`; `Procfile` starts `node backend/server.js`, which serves the built frontend when `NODE_ENV=production` (set automatically by Heroku).
4. Seed the first manager login (one-time, run against the deployed app):
   ```
   heroku run npm run seed --prefix backend
   ```
5. Visit `heroku open` and log in with the manager credentials you set in step 2.

### Redeploying after changes
If the app is connected to GitHub with automatic deploys enabled (Heroku dashboard → app → Deploy tab), pushing to GitHub is all that's needed:
```
git add -A
git commit -m "..."
git push origin main
```
Heroku picks up the push via webhook and rebuilds/redeploys automatically.

If you're deploying via the `heroku` git remote directly instead (no GitHub connection):
```
git add -A
git commit -m "..."
git push heroku main
```
