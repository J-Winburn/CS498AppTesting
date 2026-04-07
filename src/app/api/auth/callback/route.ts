import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForTokens,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_TOKEN_EXPIRY,
  COOKIE_STATE,
} from "@/lib/spotify-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state parameter" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(COOKIE_STATE);

  if (!stateCookie || stateCookie.value !== state) {
    return NextResponse.json(
      { error: "State mismatch - possible CSRF attack" },
      { status: 400 }
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const response = NextResponse.redirect(new URL("/", request.url));
    const expiryTime = Date.now() + tokens.expires_in * 1000;

    cookieStore.set(COOKIE_ACCESS_TOKEN, tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in,
    });

    cookieStore.set(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    cookieStore.set(COOKIE_TOKEN_EXPIRY, expiryTime.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in,
    });

    // Clear the state cookie
    cookieStore.delete(COOKIE_STATE);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Authentication failed: ${message}` },
      { status: 500 }
    );
  }
}
