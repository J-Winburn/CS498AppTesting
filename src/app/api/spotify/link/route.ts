import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";

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

/** Disconnect Spotify link — DB persistence removed with Prisma; session-only Spotify uses NextAuth sign-out flow instead. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    connected: false,
    spotifyId: null,
  });
}
