import { randomBytes, createHash } from "crypto";

export const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

export const SPOTIFY_LINK_SCOPES = ["user-read-private", "user-read-email"];

export const SPOTIFY_LINK_STATE_COOKIE = "spotify_link_state";
export const SPOTIFY_LINK_VERIFIER_COOKIE = "spotify_link_verifier";
export const SPOTIFY_LINK_USER_COOKIE = "spotify_link_user";

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyErrorEnvelope = {
  error?: {
    status?: number;
    message?: string;
  };
  error_description?: string;
};

export function getSpotifyLinkRedirectUri(): string {
  const redirectUri = process.env.SPOTIFY_LINK_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("SPOTIFY_LINK_REDIRECT_URI is not configured.");
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new Error("SPOTIFY_LINK_REDIRECT_URI must be a valid absolute URL.");
  }

  const isLocal127 = parsed.protocol === "http:" && parsed.hostname === "127.0.0.1";
  const isHttps = parsed.protocol === "https:";
  // Spotify redirect policy: HTTPS in general, with 127.0.0.1 allowed for local dev.
  if (!isHttps && !isLocal127) {
    throw new Error("Spotify redirect URI must use HTTPS (or http://127.0.0.1 for local development).");
  }

  if (parsed.hostname === "localhost") {
    throw new Error("Spotify redirect URI cannot use localhost. Use 127.0.0.1 for local development.");
  }

  if (parsed.hostname.includes("*")) {
    throw new Error("Spotify redirect URI cannot include wildcard hostnames.");
  }

  return redirectUri;
}

export function createPkceVerifier(): string {
  return randomBytes(64).toString("base64url");
}

export function createPkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createOAuthState(): string {
  return randomBytes(16).toString("base64url");
}

export function buildSpotifyAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes?: string[];
}) {
  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", (params.scopes ?? SPOTIFY_LINK_SCOPES).join(" "));
  return url;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<SpotifyTokenResponse> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as SpotifyTokenResponse & SpotifyErrorEnvelope;
  if (!response.ok) {
    throw new Error(extractSpotifyErrorMessage(payload, response.status, "Spotify token exchange failed."));
  }

  return payload;
}

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<SpotifyTokenResponse> {
  const basicAuth = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as SpotifyTokenResponse & SpotifyErrorEnvelope;
  if (!response.ok) {
    throw new Error(extractSpotifyErrorMessage(payload, response.status, "Spotify token refresh failed."));
  }

  return payload;
}

export async function spotifyFetchJsonWithRetry<T>(params: {
  accessToken: string;
  path: string;
  init?: RequestInit;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts = params.maxAttempts ?? 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${SPOTIFY_API_BASE_URL}${params.path}`, {
      ...params.init,
      headers: {
        ...(params.init?.headers ?? {}),
        Authorization: `Bearer ${params.accessToken}`,
      },
      cache: "no-store",
    });

    const rawBody = await response.text();
    const parsedBody = safeJsonParse(rawBody) as SpotifyErrorEnvelope | T;

    if (response.ok) {
      return parsedBody as T;
    }

    if (response.status === 429 && attempt < maxAttempts) {
      // Respect Retry-After when Spotify rate-limits the request.
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const fallbackMs = 250 * 2 ** (attempt - 1);
      const retryMs = Number.isFinite(retryAfterSeconds)
        ? Math.max(0, retryAfterSeconds * 1000)
        : fallbackMs;
      await sleep(retryMs);
      continue;
    }

    if (response.status >= 500 && response.status <= 599 && attempt < maxAttempts) {
      const backoffMs = 250 * 2 ** (attempt - 1);
      await sleep(backoffMs);
      continue;
    }

    throw new Error(
      extractSpotifyErrorMessage(parsedBody as SpotifyErrorEnvelope, response.status, "Spotify API request failed.")
    );
  }

  throw new Error("Spotify API request failed after retry attempts.");
}

export function getExpiryDate(expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000);
}

function extractSpotifyErrorMessage(payload: SpotifyErrorEnvelope, status: number, fallback: string) {
  const apiMessage = payload.error?.message ?? payload.error_description;
  if (apiMessage) {
    return `${fallback} ${status}: ${apiMessage}`;
  }
  return `${fallback} ${status}.`;
}

function safeJsonParse(input: string) {
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}