import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";

const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

const searchTypeMap = {
  all: "track,artist,album",
  track: "track",
  artist: "artist",
  album: "album",
} as const;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const type = (request.nextUrl.searchParams.get("type") || "all") as keyof typeof searchTypeMap;

  if (!query) {
    return NextResponse.json(
      { error: "Please provide a song, artist, or album to search for.", tracks: [], artists: [], albums: [] },
      { status: 400 },
    );
  }

  try {
    const session = await getServerSession(authOptions);
    const accessToken =
      (session as any)?.accessToken ?? (await getClientCredentialsToken());
    const searchParams = new URLSearchParams({
      q: query,
      type: searchTypeMap[type] ?? searchTypeMap.all,
      limit: "8",
    });

    const response = await fetch(`${SPOTIFY_SEARCH_URL}?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Spotify search request failed.");
    }

    const data = (await response.json()) as {
      tracks?: { items: unknown[] };
      artists?: { items: unknown[] };
      albums?: { items: unknown[] };
    };

    return NextResponse.json({
      tracks: data.tracks?.items ?? [],
      artists: data.artists?.items ?? [],
      albums: data.albums?.items ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message, tracks: [], artists: [], albums: [] },
      { status: 500 },
    );
  }
}
