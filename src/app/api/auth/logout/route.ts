import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_TOKEN_EXPIRY,
} from "@/lib/spotify-auth";

export async function GET() {
  const response = NextResponse.redirect("/");
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_ACCESS_TOKEN);
  cookieStore.delete(COOKIE_REFRESH_TOKEN);
  cookieStore.delete(COOKIE_TOKEN_EXPIRY);

  return response;
}
