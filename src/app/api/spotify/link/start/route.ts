import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  SPOTIFY_LINK_STATE_COOKIE,
  SPOTIFY_LINK_USER_COOKIE,
  SPOTIFY_LINK_VERIFIER_COOKIE,
  buildSpotifyAuthorizeUrl,
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  getSpotifyLinkRedirectUri,
} from "@/lib/spotify-link";

export async function GET() {
  const user = await getCurrentUser(); //check user authentication
  if (!user) {
    return NextResponse.redirect("/signin?error=auth_required");
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID; // from env file 
  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID is not configured." }, //not authenticated error
      { status: 500 }
    );
  }

  const redirectUri = getSpotifyLinkRedirectUri();
  const state = createOAuthState();
  const verifier = createPkceVerifier(); //genereate PKCE verifier
  const challenge = createPkceChallenge(verifier); //challenfe for PKCE flow based on verifier

  const authorizeUrl = buildSpotifyAuthorizeUrl({ //build spotify authorization url with necessary query params
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  //redirect user to spotify authorization page
  const response = NextResponse.redirect(authorizeUrl);
  const secure = process.env.NODE_ENV === "production";

  // Save and Store PKCE + state in short-lived httpOnly cookies for callback verification.
  response.cookies.set(SPOTIFY_LINK_STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  response.cookies.set(SPOTIFY_LINK_VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  response.cookies.set(SPOTIFY_LINK_USER_COOKIE, user.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}