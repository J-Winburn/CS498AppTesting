import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  // First try custom Spotify cookie flow
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (accessToken) {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const spotifyUser = (await response.json()) as { id: string };
        const user = await prisma.user.findUnique({
          where: { spotifyId: spotifyUser.id },
        });
        if (user) return user;
      }
    } catch {
      // fall through to NextAuth session
    }
  }

  // Fall back to NextAuth session (credentials or NextAuth Spotify login)
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    // Credentials users: session.user.id is the database UUID
    const userById = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (userById) return userById;

    // NextAuth Spotify users: session.user.id is the Spotify ID
    const userBySpotifyId = await prisma.user.findUnique({
      where: { spotifyId: session.user.id },
    });
    return userBySpotifyId;
  } catch {
    return null;
  }
}
