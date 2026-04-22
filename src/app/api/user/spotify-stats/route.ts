import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getValidSpotifyAccessTokenForUser } from "@/lib/spotify-user-token"; 

// Spotify API endpoints
const SPOTIFY_TOP_ARTISTS_ENDPOINT = "https://api.spotify.com/v1/me/top/artists";
const SPOTIFY_TOP_TRACKS_ENDPOINT = "https://api.spotify.com/v1/me/top/tracks";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const accessToken = await getValidSpotifyAccessTokenForUser(req, user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No Spotify session — sign in with Spotify or link your account when that is available." },
        { status: 403 },
      );
    }

    // Parse time_range from query params, default to 'medium_term'
    const { searchParams } = new URL(req.url);
    const time_range = searchParams.get("time_range") || "medium_term";
    const validRanges = ["short_term", "medium_term", "long_term"];
    if (!validRanges.includes(time_range)) {
      return NextResponse.json({ error: "Invalid time_range" }, { status: 400 });
    }

    // Helper to fetch from Spotify
    async function fetchSpotify(endpoint: string) {
      const url = `${endpoint}?time_range=${time_range}&limit=10`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 429) {
        const retry = res.headers.get("Retry-After") || "1";
        return NextResponse.json({ error: "Rate limited", retryAfter: retry }, { status: 429 });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err.error?.message || "Spotify API error" }, { status: res.status });
      }
      return res.json();
    }

    // Fetch top artists and tracks in parallel
    const [artistsRes, tracksRes] = await Promise.all([
      fetchSpotify(SPOTIFY_TOP_ARTISTS_ENDPOINT),
      fetchSpotify(SPOTIFY_TOP_TRACKS_ENDPOINT),
    ]);

    // If either is a NextResponse (error), return it
    if (artistsRes instanceof Response) return artistsRes;
    if (tracksRes instanceof Response) return tracksRes;

    return NextResponse.json({
      top_artists: artistsRes.items || [],
      top_tracks: tracksRes.items || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch Spotify stats" }, { status: 500 });
  }
}
