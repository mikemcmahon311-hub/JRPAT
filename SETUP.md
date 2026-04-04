# JRPAT Tracker — Setup Guide

## What This Is

A mobile-first web app for tracking Cedar Hill Fire Department JRPAT times. Public dashboard with leaderboards, crew stats, and trends. Admin panel for you and peer fitness trainers to enter/edit times.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Hosting**: Netlify
- **Charts**: Recharts
- **Icons**: Lucide React

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, name it something like "jrpat-tracker"
3. Choose a strong database password and save it somewhere
4. Wait for the project to finish provisioning

## Step 2: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Copy the entire contents and paste into the SQL Editor → click **Run**
4. Then open `supabase/seed.sql`, paste it in, and **Run** it too
5. This creates all your tables and loads every firefighter + their historical times

## Step 3: Configure Environment Variables

1. In Supabase dashboard, go to **Settings → API**
2. Copy your **Project URL** and **anon/public key**
3. In this project folder, rename `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

## Step 4: Create Your Admin Account

1. In Supabase dashboard, go to **Authentication → Users**
2. Click **Add User → Create new user**
3. Enter your email and a password
4. After the user is created, go to **SQL Editor** and run:

```sql
UPDATE profiles
SET role = 'admin', display_name = 'Mike McMahon'
WHERE email = 'your-email@example.com';
```

5. Repeat for any peer fitness trainers who need access (they'll get 'trainer' role by default)

## Step 5: Run Locally

```bash
cd jrpat-app
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Step 6: Deploy to Netlify

### Option A: Git-based deploy (recommended)
1. Push this project to a GitHub repo
2. Go to [netlify.com](https://netlify.com), sign in, click **Add new site → Import from Git**
3. Select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**

### Option B: Manual deploy
```bash
npm run build
# Then drag the "dist" folder into Netlify's deploy dropzone
```

---

## App Structure

```
Public (no login required):
  /              → Dashboard with KPIs, station showdown, trends
  /leaderboard   → Individual, crew, and PB leaderboards
  /roster        → Searchable full roster
  /member/:id    → Individual member profile + history
  /trends        → Dept analysis, distributions, comparisons

Protected (login required):
  /login         → Email/password sign in
  /admin         → Enter times, manage members, view recent entries
```

## Adding New Times

1. Log in at /login
2. Go to /admin
3. Select the member from the dropdown
4. Enter the year and time (M:SS format, e.g. "4:21")
5. Check "Placeholder" if it's an injured member's substitute time
6. Click Submit — it immediately updates the public dashboard

## Future Enhancements

- Push notifications when PBs are set
- Photo uploads for test day
- PDF report generation
- Historical year comparison tool
- Bulk time import via CSV
