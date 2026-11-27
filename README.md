# IntelliSpeak

An AI-powered presentation coach. IntelliSpeak gives speakers real-time and post-session feedback on
speech, body language, facial engagement and content, and tracks their progress over time.

Final-year BS Computer Science project, COMSATS University Islamabad.

## Tech stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Frontend   | React 18 + Vite, React Router                |
| Backend    | FastAPI 0.115 on Python 3.11                 |
| Auth + DB  | Supabase (PostgreSQL, Auth, Row-Level Security) |
| Generative AI | Google Gemini 2.5 Flash                   |
| Media storage | Cloudinary                                |

## Repository layout

```
frontend/              React + Vite web app
  src/context/         Auth state (Supabase session + profile)
  src/pages/           Login/Register (M1), Dashboard shell (M2), Profile/Settings (M14)
  src/components/      App layout, sidebar, header, cooldown indicator, form helpers
backend/               FastAPI service
  app/core/auth.py     Supabase JWT verification middleware
  app/api/routes.py    /api/health (public) and /api/me (authenticated)
  tests/               pytest suite
supabase/migrations/   SQL schema: profiles, sessions, analysis_results, feedback (RLS on)
.env.example           Every environment variable the project uses
```

## Prerequisites

- Node.js 18 or newer
- Python 3.11
- A free [Supabase](https://supabase.com) project
- (Later phases) a Gemini API key and a Cloudinary account

## Setup

### 1. Environment variables

```bash
cp .env.example .env
```

Fill in `.env` from your Supabase dashboard (**Project Settings → API**). The frontend and backend both
read this one file. Never commit `.env`; it is git-ignored.

- `SUPABASE_URL`, `VITE_SUPABASE_URL`: your project URL.
- `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`: the public anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server only. It bypasses RLS, so never put it in a `VITE_` variable.
- `SUPABASE_JWT_SECRET`: only needed if your project still uses the legacy HS256 JWT secret. Newer
  projects sign tokens with asymmetric keys, and the backend verifies those through the project's JWKS
  endpoint automatically.

### 2. Database

Apply the migration in `supabase/migrations/` using either option:

- **Dashboard:** open **SQL Editor**, paste the contents of
  `supabase/migrations/20261127000000_initial_schema.sql`, and run it.
- **Supabase CLI:** `supabase link --project-ref <your-ref>` then `supabase db push`.

This creates the four tables, turns on RLS, and adds a trigger that creates a `profiles` row for every
new user.

### 3. Supabase Auth settings

In **Authentication → URL Configuration**, set:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** `http://localhost:5173/dashboard` and `http://localhost:5173/reset-password`

Optional: enable the **Google** provider under **Authentication → Providers** for "Continue with Google".

### 4. Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Check it: <http://localhost:8000/api/health>. Interactive docs are at <http://localhost:8000/docs>.

Run the tests:

```bash
pytest
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>, create an account, and confirm it from the email Supabase sends.

## How authentication works

1. The React app signs users in with Supabase Auth (email/password or Google).
2. Supabase returns a JWT access token. The frontend reads and writes the user's own rows directly
   through Supabase, and RLS limits every query to that user.
3. For backend calls, `frontend/src/lib/api.js` sends the token as `Authorization: Bearer <token>`.
4. `SupabaseAuthMiddleware` verifies the signature, expiry, audience and issuer for every `/api` route
   except `/api/health`, and puts the user on `request.state.user`. Routes use the
   `get_current_user` dependency to read it.

## Database overview

| Table              | Purpose                                                     | User access via RLS        |
| ------------------ | ----------------------------------------------------------- | -------------------------- |
| `profiles`         | Personal info, skill level, goals, coaching and alert preferences, cooldown duration | Read and edit own row (preference columns only) |
| `sessions`         | Practice sessions, recordings and uploads                   | Read, create, rename, delete own |
| `analysis_results` | Per-module scores and metrics for a session                 | Read own                   |
| `feedback`         | Feedback items and recommendations for a session            | Read own                   |

Status, scores, `cooldown_until` and analysis output are written by the backend with the service role
key, so users cannot change them from the browser (for example, they cannot skip a cooldown).

## Roadmap

- [x] Phase 0: monorepo, environment template, README
- [x] Phase 1 (Module 1): auth, login/register, profile and settings, dashboard shell, schema with RLS
- [ ] Module 2: AI script and outline generation (Gemini)
- [ ] Modules 3 to 9: live practice, recording and upload, speech, body, facial and content analysis, feedback
- [ ] Module 10: history and analytics
