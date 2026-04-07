import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getValidUserToken } from "@/lib/spotify-auth";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";

const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

const searchTypeMap = {
  all: "track,artist",
  track: "track",
  artist: "artist",
} as const;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const type = (request.nextUrl.searchParams.get("type") || "all") as keyof typeof searchTypeMap;

  if (!query) {
    return NextResponse.json(
      { error: "Please provide a song or artist to search for.", tracks: [], artists: [] },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const userToken = await getValidUserToken(cookieStore);
    const accessToken = userToken ?? (await getClientCredentialsToken());
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
    };

    return NextResponse.json({
      tracks: data.tracks?.items ?? [],
      artists: data.artists?.items ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message, tracks: [], artists: [] },
      { status: 500 },
    );
  }
}
