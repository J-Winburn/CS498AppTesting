import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getValidUserToken } from "@/lib/spotify-auth";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";

type SpotifyAlbum = {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
};

type Album = {
  id: string;
  name: string;
  artist: string;
  image: string;
};

async function getRandomSpotifyAlbums(): Promise<Album[]> {
  try {
    const token = await getClientCredentialsToken();

    const response = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?limit=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error("Spotify request failed");

    const data = (await response.json()) as {
      albums?: { items: SpotifyAlbum[] };
    };
    const albums = data.albums?.items ?? [];

    return albums
      .filter((album) => album.images.length > 0)
      .slice(0, 20)
      .map((album) => ({
        id: album.id,
        name: album.name,
        artist: album.artists[0]?.name || "Unknown",
        image: album.images[0]?.url || "",
      }));
  } catch (error) {
    console.error("Spotify fetch failed:", error);
    return [];
  }
}

async function getRandomMusicBrainzAlbums(): Promise<Album[]> {
  try {
    const releases: Album[] = [];
    const artists = [
      "Kendrick Lamar",
      "Drake",
      "The Weeknd",
      "Bad Bunny",
      "Taylor Swift",
      "Ariana Grande",
      "Post Malone",
      "Billie Eilish",
      "Harry Styles",
      "Dua Lipa",
    ];

    // Fetch releases from multiple artists
    for (const artist of artists.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://musicbrainz.org/ws/2/release?query=artist:"${artist}"&limit=5&fmt=json`,
          {
            headers: { "User-Agent": "Tune-Headz/1.0" },
            cache: "no-store",
          }
        );

        if (!response.ok) continue;

        const data = (await response.json()) as {
          releases?: Array<{
            id: string;
            title: string;
            "artist-credit": Array<{ name: string }>;
          }>;
        };

        const items = data.releases?.slice(0, 5) ?? [];

        for (const release of items) {
          // Try to get cover art from Cover Art Archive
          const coverResponse = await fetch(
            `https://coverartarchive.org/release/${release.id}/front-500.jpg`,
            { cache: "no-store" }
          ).catch(() => null);

          const image =
            coverResponse && coverResponse.ok
              ? `https://coverartarchive.org/release/${release.id}/front-500.jpg`
              : "";

          if (image) {
            releases.push({
              id: release.id,
              name: release.title,
              artist: release["artist-credit"]?.[0]?.name || "Unknown",
              image,
            });
          }
        }
      } catch (e) {
        continue;
      }
    }

    return releases.slice(0, 20);
  } catch (error) {
    console.error("MusicBrainz fetch failed:", error);
    return [];
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userToken = await getValidUserToken(cookieStore);

    let albums: Album[] = [];

    // If user is logged in, use Spotify. Otherwise use MusicBrainz
    if (userToken) {
      albums = await getRandomSpotifyAlbums();
    } else {
      albums = await getRandomMusicBrainzAlbums();
    }

    if (albums.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch albums" },
        { status: 500 }
      );
    }

    // Shuffle albums
    albums = albums.sort(() => Math.random() - 0.5);

    return NextResponse.json({ albums });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
