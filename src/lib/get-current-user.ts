import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  // Primary auth path: TuneHeadz session via NextAuth.
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      // Credentials users: session.user.id is the database UUID.
      const userById = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
      if (userById) return userById;

      // Legacy NextAuth Spotify users: session.user.id may be Spotify ID.
      const userBySpotifyId = await prisma.user.findUnique({
        where: { spotifyId: session.user.id },
      });
      if (userBySpotifyId) return userBySpotifyId;
    }
  } catch {
    return null;
  }

  return null;
}
