import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
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

export async function GET(req: NextRequest) {
  const redirectUri = getSpotifyLinkRedirectUri();

  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret ? await getToken({ req, secret }) : null;
  if (!token?.sub) {
    const base = process.env.NEXTAUTH_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    return NextResponse.redirect(new URL("/signin?error=auth_required", base));
  }
  const userId = token.sub;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID is not configured." }, { status: 500 });
  }

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

  response.cookies.set(SPOTIFY_LINK_USER_COOKIE, userId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}