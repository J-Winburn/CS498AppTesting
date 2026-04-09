import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) { //check if user is authenticated
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    connected: Boolean(user.spotifyId), //check if spotifyId exists to determine if connected
    spotifyId: user.spotifyId, //return spotifyId for reference
  });
}
//disconnect spotify account by clearing spotify related fields in the database
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      spotifyId: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
      authProvider: user.authProvider === "both" ? "native" : user.authProvider, //if user has both native and spotify, keep native as provider after disconnecting spotify
    },
  });
  //return updated spotify connection status and spotifyId (which should be null after disconnect)
  return NextResponse.json({
    connected: Boolean(updated.spotifyId),
    spotifyId: updated.spotifyId,
  });
}