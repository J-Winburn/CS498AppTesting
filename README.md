# TuneHeadz

Next.js application that allows users to rate and review songs, albums, and artists via the Spotify API.

## Guide to Run Locally

1. `npm install`
2. Create `.env.local` and set:
   - `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - `SPOTIFY_LINK_REDIRECT_URI` — `http://127.0.0.1:3000/api/spotify/link/callback`
   - `NEXTAUTH_URL` — `http://127.0.0.1:3000`
   - `NEXTAUTH_SECRET` — run `npx auth secret`
   - `DATABASE_URL` — Postgres connection string
   - `REPLICATE_API_TOKEN` (optional, only needed for `/generate` endpoints)
3. In the Spotify app settings, add this exact redirect URI:
   - `http://127.0.0.1:3000/api/spotify/link/callback`
4. Run Prisma setup:
   - `npx prisma generate`
   - `npx prisma migrate deploy`
5. Start the app:
   - `npm run dev`
6. Open the app at:
   - `http://127.0.0.1:3000`

## Notes for Dev Team

- Use `127.0.0.1` in development (not `localhost`) for Spotify linking.
- Spotify treats `localhost` and `127.0.0.1` as different origins, which can break OAuth callback state/cookies if mixed.