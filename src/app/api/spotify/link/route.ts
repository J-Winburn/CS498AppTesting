import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getSupabaseAdminOrNull } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminOrNull();
  if (!supabase) {
    return NextResponse.json({
      connected: false,
      spotifyId: null,
    });
  }

  const { data } = await supabase
    .from("user_profiles")
    .select("spotify_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const spotifyId = data?.spotify_id ?? null;

  return NextResponse.json({
    connected: Boolean(spotifyId),
    spotifyId,
  });
}

/** Disconnect Spotify link — DB persistence removed with Prisma; session-only Spotify uses NextAuth sign-out flow instead. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      spotify_id: null,
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
      spotify_scope: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to disconnect Spotify." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    connected: false,
    spotifyId: null,
  });
}
