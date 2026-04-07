import type { SpotifyUser } from "@/types/spotify";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";

const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-library-read",
].join(" ");

const COOKIE_ACCESS_TOKEN = "sp_access_token";
const COOKIE_REFRESH_TOKEN = "sp_refresh_token";
const COOKIE_TOKEN_EXPIRY = "sp_token_expiry";
const COOKIE_STATE = "sp_oauth_state";

export function buildAuthorizationUrl(): { url: string; state: string } {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID || "",
    scope: SPOTIFY_SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI || "",
    state,
  });

  return {
    url: `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`,
    state,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Spotify configuration");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Token exchange failed");
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
  }>;
}

export async function getValidUserToken(
  cookieStore: any
): Promise<string | null> {
  const accessTokenCookie = cookieStore.get(COOKIE_ACCESS_TOKEN);
  const refreshTokenCookie = cookieStore.get(COOKIE_REFRESH_TOKEN);
  const tokenExpiryCookie = cookieStore.get(COOKIE_TOKEN_EXPIRY);

  if (!accessTokenCookie || !refreshTokenCookie || !tokenExpiryCookie) {
    return null;
  }

  const expiryTime = parseInt(tokenExpiryCookie.value, 10);
  const now = Date.now();
  const buffer = 60_000; // 60-second buffer before expiry

  if (now < expiryTime - buffer) {
    // Token is still valid
    return accessTokenCookie.value;
  }

  // Token expired or about to expire, try to refresh
  try {
    const refreshed = await refreshAccessToken(refreshTokenCookie.value);
    const newExpiry = now + refreshed.expires_in * 1000;

    // Store the refreshed values for the caller to set as cookies
    // This is a placeholder - the actual cookie setting happens in the route handler
    return refreshed.access_token;
  } catch {
    // Refresh failed, token is no longer valid
    return null;
  }
}

export async function getSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Spotify user");
  }

  return response.json() as Promise<SpotifyUser>;
}

// Export constants for cookie management
export { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN, COOKIE_TOKEN_EXPIRY, COOKIE_STATE };
