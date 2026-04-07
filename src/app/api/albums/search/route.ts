import { NextRequest, NextResponse } from "next/server";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";

type Album = {
  id: string;
  name: string;
  artist: string;
  image: string;
};

async function searchSpotify(query: string): Promise<Album[]> {
  try {
    const token = await getClientCredentialsToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error("Spotify search failed");

    const data = (await response.json()) as {
      albums?: {
        items: Array<{
          id: string;
          name: string;
          artists: { name: string }[];
          images: { url: string }[];
        }>;
      };
    };

    const albums = data.albums?.items ?? [];
    return albums.map((album) => ({
      id: album.id,
      name: album.name,
      artist: album.artists[0]?.name || "Unknown",
      image: album.images[0]?.url || "",
    }));
  } catch (error) {
    console.error("Spotify search error:", error);
    throw error;
  }
}

async function searchMusicBrainz(query: string): Promise<Album[]> {
  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(query)}&limit=10&fmt=json`,
      {
        headers: { "User-Agent": "Tune-Headz/1.0" },
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error("MusicBrainz search failed");

    const data = (await response.json()) as {
      releases?: Array<{
        id: string;
        title: string;
        "artist-credit": Array<{ name: string }>;
      }>;
    };

    const releases = data.releases ?? [];
    return releases.map((release) => ({
      id: release.id,
      name: release.title,
      artist:
        release["artist-credit"]?.[0]?.name || "Unknown",
      image: "", // Would need Cover Art Archive
    }));
  } catch (error) {
    console.error("MusicBrainz search error:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const source = request.nextUrl.searchParams.get("source") || "spotify";

  if (!query) {
    return NextResponse.json(
      { error: "Search query required", albums: [] },
      { status: 400 }
    );
  }

  try {
    let albums: Album[] = [];

    if (source === "musicbrainz") {
      albums = await searchMusicBrainz(query);
    } else {
      albums = await searchSpotify(query);
    }

    return NextResponse.json({ albums });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json(
      { error: message, albums: [] },
      { status: 500 }
    );
  }
}
