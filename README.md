# TuneHeadz

Next.js application that allows users to rate and review songs, albums, and artists via the Spotify API.

## Guide to Run Locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - `SPOTIFY_REDIRECT_URI` — e.g. `http://127.0.0.1:3000/api/auth/callback/spotify` (same port as in the browser. In the Spotify app **Settings**, add that **exact** URL under **Redirect URIs** and save—Spotify only allows redirects you list there, so this is required in addition to `.env`.)
   - `NEXTAUTH_URL` — same host as you use in the browser (Spotify treats `localhost` and `127.0.0.1` as different; pick one and use it everywhere)
   - `NEXTAUTH_SECRET` — run `npx auth secret`
   - `DATABASE_URL` — Postgres connection string (ask Rowan for it)
3. Run `npx prisma generate` to generate the Prisma Client for the database
4. Build using `npm run dev` and open using corresponding local path (Example: `http://127.0.0.1:3000`)