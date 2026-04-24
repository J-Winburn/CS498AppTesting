import { NextRequest, NextResponse } from "next/server";

const CLEAR_PATHS = ["/", "/api/auth"];

function isAuthCookie(name: string) {
  return (
    name.includes("next-auth") ||
    name.includes("authjs") ||
    name.includes("session-token") ||
    name.includes("csrf-token") ||
    name.includes("callback-url") ||
    name === "th_session" ||
    name.startsWith("spotify_")
  );
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const cookieNames = new Set(
    request.cookies
      .getAll()
      .map((cookie) => cookie.name)
      .filter(isAuthCookie)
  );

  if (process.env.NODE_ENV !== "production") {
    console.info("[logout] clearing cookies:", Array.from(cookieNames));
  }

  for (const name of cookieNames) {
    for (const path of CLEAR_PATHS) {
      response.cookies.set({
        name,
        value: "",
        path,
        expires: new Date(0),
      });
    }
  }

  return response;
}