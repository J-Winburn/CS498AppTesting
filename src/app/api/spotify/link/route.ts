import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    connected: Boolean(user.spotifyId),
    spotifyId: user.spotifyId,
  });
}

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
      authProvider: user.authProvider === "both" ? "native" : user.authProvider,
    },
  });

  return NextResponse.json({
    connected: Boolean(updated.spotifyId),
    spotifyId: updated.spotifyId,
  });
}