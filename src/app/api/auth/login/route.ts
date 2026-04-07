import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizationUrl, COOKIE_STATE } from "@/lib/spotify-auth";

export async function GET() {
  const { url, state } = buildAuthorizationUrl();

  const response = NextResponse.redirect(url);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  return response;
}
