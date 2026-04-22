import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Read Spotify access token from NextAuth JWT (OAuth sign-in).
 * Persistent per-user tokens were previously in Prisma; revisit with Supabase + linked-account flow if needed.
 */
export async function getValidSpotifyAccessTokenForUser(
  req: NextRequest,
  userId: string,
): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req, secret });
  if (!token?.sub || token.sub !== userId) return null;

  const accessToken = token.accessToken as string | undefined;
  if (!accessToken) return null;

  const accessTokenExpires = token.accessTokenExpires as number | undefined;
  if (
    typeof accessTokenExpires === "number" &&
    Number.isFinite(accessTokenExpires) &&
    Date.now() >= accessTokenExpires - 60_000
  ) {
    return null;
  }

  return accessToken;
}
