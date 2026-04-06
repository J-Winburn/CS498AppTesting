# CS498AppTesting

A Next.js app with two features:
- **Spotify Search** (`/`) — search for songs and artists via the Spotify API
- **AI Music Generation** (`/generate`) — generate original music from a text prompt using Replicate's MusicGen model

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment file and add your Spotify app credentials:
   ```bash
   cp .env.example .env.local
   ```
3. Add values for:
   - `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - `REPLICATE_API_TOKEN` — from [replicate.com](https://replicate.com) (free credits available, no card required)
4. Start the app:
   ```bash
   npm run dev
   ```