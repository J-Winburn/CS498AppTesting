import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { refreshAccessToken } from "@/lib/spotify-link";

/**
 * Returns a valid Spotify access token for the given user.
 *
 * Priority order:
 * 1. NextAuth JWT — set when the user signed in via the Spotify OAuth provider.
 * 2. Supabase user_profiles — set when the user linked Spotify via the PKCE flow
 *    (/api/spotify/link/start). Tokens are refreshed automatically when expired.
 */
export async function getValidSpotifyAccessTokenForUser(
  req: NextRequest,
  userId: string,
): Promise<string | null> {
  // 1. Check the NextAuth JWT (users who signed in WITH Spotify).
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const token = await getToken({ req, secret });
    if (token?.sub === userId) {
      const accessToken = token.accessToken as string | undefined;
      const accessTokenExpires = token.accessTokenExpires as number | undefined;
      const jwtTokenValid =
        accessToken &&
        (typeof accessTokenExpires !== "number" ||
          !Number.isFinite(accessTokenExpires) ||
          Date.now() < accessTokenExpires - 60_000);
      if (jwtTokenValid) return accessToken!;
    }
  }

  // 2. Fall back to the linked Spotify token stored in Supabase (credentials users
  //    who went through the PKCE link flow).
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "spotify_access_token, spotify_refresh_token, spotify_token_expires_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.spotify_access_token) return null;

  const expiresAt = data.spotify_token_expires_at
    ? new Date(data.spotify_token_expires_at).getTime()
    : null;
  const isExpired =
    expiresAt !== null && Number.isFinite(expiresAt) && Date.now() >= expiresAt - 60_000;

  if (!isExpired) return data.spotify_access_token;

  // Token is expired — attempt a refresh.
  if (!data.spotify_refresh_token) return null;

  try {
    const refreshed = await refreshAccessToken({
      refreshToken: data.spotify_refresh_token,
      clientId,
      clientSecret,
    });

    const newExpiresAt = new Date(
      Date.now() + refreshed.expires_in * 1000,
    ).toISOString();

    await supabase
      .from("user_profiles")
      .update({
        spotify_access_token: refreshed.access_token,
        spotify_token_expires_at: newExpiresAt,
        ...(refreshed.refresh_token
          ? { spotify_refresh_token: refreshed.refresh_token }
          : {}),
      })
      .eq("user_id", userId);

    return refreshed.access_token;
  } catch {
    return null;
  }
}
