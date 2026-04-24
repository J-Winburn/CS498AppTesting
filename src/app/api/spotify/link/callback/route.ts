import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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

    const spotifyMe = await spotifyFetchJsonWithRetry<SpotifyMeResponse>({
      accessToken: tokenResponse.access_token,
      path: "/me",
    });

    const profileEmail = currentUser.email ?? spotifyMe.email;
    if (!profileEmail) {
      throw new Error("Cannot link Spotify without an email on the current account.");
    }

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    const { error: upsertError } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: currentUser.id,
        email: profileEmail,
        updated_at: new Date().toISOString(),
        spotify_id: spotifyMe.id,
        spotify_access_token: tokenResponse.access_token,
        spotify_refresh_token: tokenResponse.refresh_token ?? null,
        spotify_token_expires_at: expiresAt,
        spotify_scope: tokenResponse.scope ?? null,
      }, { onConflict: "user_id" });

    if (upsertError) {
      throw new Error(`Failed to save Spotify tokens: ${upsertError.message}`);
    }

    return clearCookiesAndRedirect(request, "spotify_linked", "1", "/spotify-linked");
  } catch (error) {
    const message = error instanceof Error ? error.message : "link_failed";
    return clearCookiesAndRedirect(request, "spotify_error", message);
  }
}

function clearCookiesAndRedirect(
  request: NextRequest,
  queryKey: string,
  queryValue: string,
  pathname = "/profile"
) {
  const redirectUrl = new URL(pathname, request.url);
  redirectUrl.searchParams.set(queryKey, queryValue);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(SPOTIFY_LINK_STATE_COOKIE);
  response.cookies.delete(SPOTIFY_LINK_VERIFIER_COOKIE);
  response.cookies.delete(SPOTIFY_LINK_USER_COOKIE);
  return response;
}
