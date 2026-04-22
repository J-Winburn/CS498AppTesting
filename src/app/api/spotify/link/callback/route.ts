import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  SPOTIFY_LINK_STATE_COOKIE,
  SPOTIFY_LINK_USER_COOKIE,
  SPOTIFY_LINK_VERIFIER_COOKIE,
  exchangeCodeForTokens,
  getSpotifyLinkRedirectUri,
  spotifyFetchJsonWithRetry,
} from "@/lib/spotify-link";

type SpotifyMeResponse = {
  id: string;
  display_name: string | null;
  email: string | null;
  images?: Array<{ url?: string }>;
};

export async function GET(request: NextRequest) {
  const callbackError = request.nextUrl.searchParams.get("error");
  if (callbackError) {
    return clearCookiesAndRedirect(request, "spotify_error", callbackError);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return clearCookiesAndRedirect(request, "spotify_error", "missing_code_or_state");
  }

  const stateCookie = request.cookies.get(SPOTIFY_LINK_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(SPOTIFY_LINK_VERIFIER_COOKIE)?.value;
  const linkUserId = request.cookies.get(SPOTIFY_LINK_USER_COOKIE)?.value;
  if (!stateCookie || !verifier || !linkUserId) {
    return clearCookiesAndRedirect(request, "spotify_error", "session_expired");
  }

  if (stateCookie !== state) {
    return clearCookiesAndRedirect(request, "spotify_error", "state_mismatch");
  }

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.id !== linkUserId) {
    return clearCookiesAndRedirect(request, "spotify_error", "auth_required");
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      throw new Error("SPOTIFY_CLIENT_ID is not configured.");
    }

    const tokenResponse = await exchangeCodeForTokens({
      code,
      codeVerifier: verifier,
      redirectUri: getSpotifyLinkRedirectUri(),
      clientId,
    });

    await spotifyFetchJsonWithRetry<SpotifyMeResponse>({
      accessToken: tokenResponse.access_token,
      path: "/me",
    });

    // Persisting Spotify tokens previously used Prisma; migrate to Supabase user_profiles/extra table when ready.
    return clearCookiesAndRedirect(request, "spotify_linked", "1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "link_failed";
    return clearCookiesAndRedirect(request, "spotify_error", message);
  }
}

function clearCookiesAndRedirect(request: NextRequest, queryKey: string, queryValue: string) {
  const redirectUrl = new URL("/profile", request.url);
  redirectUrl.searchParams.set(queryKey, queryValue);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(SPOTIFY_LINK_STATE_COOKIE);
  response.cookies.delete(SPOTIFY_LINK_VERIFIER_COOKIE);
  response.cookies.delete(SPOTIFY_LINK_USER_COOKIE);
  return response;
}
