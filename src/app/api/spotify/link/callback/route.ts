import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  SPOTIFY_LINK_STATE_COOKIE,
  SPOTIFY_LINK_USER_COOKIE,
  SPOTIFY_LINK_VERIFIER_COOKIE,
  exchangeCodeForTokens,
  getExpiryDate,
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
  // Missing link cookies means the OAuth handoff context is gone/expired.
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

    // Use /me to bind the authorized Spotify account to the current app user.
    const spotifyMe = await spotifyFetchJsonWithRetry<SpotifyMeResponse>({
      accessToken: tokenResponse.access_token,
      path: "/me",
    });

    const existingLinkedUser = await prisma.user.findUnique({
      where: { spotifyId: spotifyMe.id },
      select: { id: true },
    });

    if (existingLinkedUser && existingLinkedUser.id !== currentUser.id) {
      return clearCookiesAndRedirect(request, "spotify_error", "already_linked_elsewhere");
    }

    const expiresAt = getExpiryDate(tokenResponse.expires_in);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        spotifyId: spotifyMe.id,
        spotifyAccessToken: tokenResponse.access_token,
        spotifyRefreshToken: tokenResponse.refresh_token,
        spotifyTokenExpiresAt: expiresAt,
        profileImage: currentUser.profileImage ?? spotifyMe.images?.[0]?.url ?? null,
        authProvider:
          currentUser.authProvider === "native" ? "both" : currentUser.authProvider,
      },
    });

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
  // Always clear one-time OAuth cookies once callback finishes.
  response.cookies.delete(SPOTIFY_LINK_STATE_COOKIE);
  response.cookies.delete(SPOTIFY_LINK_VERIFIER_COOKIE);
  response.cookies.delete(SPOTIFY_LINK_USER_COOKIE);
  return response;
}