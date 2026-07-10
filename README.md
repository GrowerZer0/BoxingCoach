# BoxingCoach
# 🥊 AI Tactical Boxing Coach

An interactive voice-guided boxing trainer built with Next.js, Supabase, and the Web Speech API.

## Features
- Custom round timer & rest periods
- Dynamic voice callouts (combos + defensive cues)
- Pressure / Counter-punching intensity modes
- Workout history with detailed logs
- PWA ready — install to home screen

## Tech Stack
- Next.js 14 (React, TypeScript)
- Supabase (PostgreSQL, Auth, RLS)
- Tailwind CSS
- Web Speech API (Text-to-Speech)

## Setup
1. Clone the repo
2. Create a Supabase project and run the SQL schema (see `schema.sql`)
3. Copy `.env.example` to `.env.local` and fill in your Supabase keys
4. `npm install`
5. `npm run dev`

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deployment
Deploy to Vercel with the above environment variables set in the project dashboard.

## License
Apache License 2.0