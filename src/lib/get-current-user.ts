import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/** Matches legacy Prisma-era shape enough for routes still migrating off Prisma. */
export type LegacyAppUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  spotifyId?: string | null;
  spotifyAccessToken?: string | null;
  spotifyRefreshToken?: string | null;
  spotifyTokenExpiresAt?: Date | null;
  authProvider?: string | null;
  profileImage?: string | null;
};

export async function getCurrentUser(): Promise<LegacyAppUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;

  return {
    id,
    email: session.user.email,
    name: session.user.name,
    spotifyId: null,
    authProvider: null,
    profileImage: session.user.image ?? null,
  };
}
