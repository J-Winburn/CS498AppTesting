# Spotify Search Frontend

A Next.js app that lets users search Spotify and log in with their Spotify accounts. Features OAuth authentication, personalized tokens, and fallback to app credentials for anonymous searches.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create App"**
3. Fill in app name/description and accept terms
4. Go to **Settings** and copy your **Client ID** and **Client Secret**

### 3. Configure Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

### 4. Register Redirect URI in Spotify
1. In your Spotify app settings, find **"Redirect URIs"**
2. Add: `http://localhost:3000/callback`
3. Click **Save**

### 5. Start the App
```bash
npm run dev
```

Visit **http://localhost:3000** and click "Log in with Spotify"!

---

## Features

### 🔐 Spotify OAuth Authentication
- Users can log in with their Spotify accounts
- Access tokens stored securely in HTTP-only cookies
- Automatic token refresh when expired
- User's display name shown in header when logged in

### 🔍 Smart Search
- Logged-in users: Search uses their personal Spotify token
- Anonymous users: Search falls back to app-level credentials
- Supports filtering by Songs, Artists, or All

### 📋 Requested Scopes
- `user-read-private` - Read user profile info
- `user-read-email` - Read user email
- `user-top-read` - Read user's top tracks/artists
- `user-library-read` - Read user's saved tracks/artists

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              Root layout with Header
│   ├── page.tsx                Main search UI
│   ├── globals.css             Dark theme with Spotify green
│   ├── callback/route.ts       OAuth callback handler
│   └── api/
│       ├── auth/
│       │   ├── login/          Start OAuth flow
│       │   ├── callback/       Alternative callback route
│       │   └── logout/         Clear session
│       └── search/             Search API endpoint
├── components/
│   └── Header.tsx              Login/logout UI
├── lib/
│   ├── spotify-auth.ts         OAuth utilities
│   └── spotify-client-credentials.ts  App-level token
└── types/
    └── spotify.ts              TypeScript types
```

---

## Authentication Flow

1. **User clicks "Log in with Spotify"** → Redirected to Spotify's authorization screen
2. **User approves** → Spotify redirects back to `/callback`
3. **Server exchanges code for tokens** → Stores in HTTP-only cookies
4. **User is now logged in** → Header shows display name + logout button
5. **Search uses user token** → Personalized results
6. **Automatic refresh** → Access tokens refresh before expiry

---

## Public Sharing (Development)

To share the app with others during development, use **ngrok**:

### Setup ngrok
```bash
brew install ngrok  # macOS

# Or download from https://ngrok.com/download
```

### Get an Auth Token
1. Sign up at https://dashboard.ngrok.com/signup
2. Copy your auth token from the dashboard
3. Run: `ngrok config add-authtoken YOUR_TOKEN`

### Start Tunnel
```bash
ngrok http 3000
```

You'll get a public HTTPS URL like: `https://xxxxx.ngrok-free.dev`

### Update Spotify Dashboard
1. Add the ngrok callback URL to Redirect URIs:
   ```
   https://xxxxx.ngrok-free.dev/callback
   ```
2. Update `.env.local`:
   ```
   SPOTIFY_REDIRECT_URI=https://xxxxx.ngrok-free.dev/callback
   ```
3. Restart the dev server

Now others can visit your public URL and log in!

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Yes | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Yes | Must match Spotify Dashboard exactly (e.g., `http://localhost:3000/callback` or `https://xxxx.ngrok-free.dev/callback`) |

---

## Development

### Run Tests
```bash
npm run lint
```

### Build for Production
```bash
npm run build
npm start
```

---

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Spotify Web API** - OAuth & Search endpoints

---

## Notes

- Spotify's redirect URI must be **byte-for-byte identical** to what's registered in the dashboard
- Access tokens expire after ~1 hour and are automatically refreshed
- Search works without login (uses app credentials) for better UX
- The "Log in with Spotify" button is in the header
- All tokens stored in secure HTTP-only cookies

---

## Troubleshooting

**"client_id: Not present"**
- Ensure `.env.local` has `SPOTIFY_CLIENT_ID` set
- Restart the dev server after updating `.env.local`

**"redirect_uri: Not matching configuration"**
- Check Spotify Dashboard - make sure the redirect URI is saved
- Ensure the URL in `.env.local` matches exactly what's in Spotify (no extra spaces, exact case)
- For ngrok: Make sure you updated both `.env.local` AND Spotify Dashboard with the same URL

**"State mismatch - possible CSRF attack"**
- This is a security feature. Clear browser cookies and try logging in again