import { prisma } from "@/lib/prisma";
import { getExpiryDate, refreshAccessToken } from "@/lib/spotify-link";

const EXPIRY_SKEW_MS = 60_000;

export async function getValidSpotifyAccessTokenForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      spotifyAccessToken: true,
      spotifyRefreshToken: true,
      spotifyTokenExpiresAt: true,
    },
  });

  if (!user?.spotifyAccessToken || !user.spotifyRefreshToken || !user.spotifyTokenExpiresAt) {
    throw new Error("Spotify account is not linked.");
  }

  const expiresSoon = user.spotifyTokenExpiresAt.getTime() <= Date.now() + EXPIRY_SKEW_MS;
  if (!expiresSoon) {
    return user.spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify token refresh is not configured.");
  }

  const refreshed = await refreshAccessToken({
    refreshToken: user.spotifyRefreshToken,
    clientId,
    clientSecret,
  });

  // Persist refreshed credentials so subsequent API calls reuse valid tokens.
  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: refreshed.access_token,
      spotifyRefreshToken: refreshed.refresh_token ?? user.spotifyRefreshToken,
      spotifyTokenExpiresAt: getExpiryDate(refreshed.expires_in),
    },
  });

  return refreshed.access_token;
}