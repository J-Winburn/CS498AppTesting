import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";
import type { AlbumCard } from "@/types/album";

/**
 * Swap this ID to change which playlist drives the carousel. Find a playlist ID by opening a
 * Spotify playlist, clicking Share → Copy link, and grabbing the ID from the URL (the part after
 * /playlist/ and before ?).
 *
 * Override with env `BILLBOARD_CAROUSEL_PLAYLIST_ID` or `NEXT_PUBLIC_BILLBOARD_CAROUSEL_PLAYLIST_ID`.
 *
 * Default playlist (search in Spotify: **Top Albums - Global**) — editorial chart playlist IDs
 * often 404 via API when retired; this ID matches the public Top Albums - Global listing.
 * If the primary fails, `CAROUSEL_PLAYLIST_FALLBACK_IDS` are tried in order.
 */
export const BILLBOARD_CAROUSEL_PLAYLIST_ID_DEFAULT = "7qWT4WcLgV6UUIPde0fqf9"; // Top Albums - Global

/** Editorial/global charts — unique albums derived from each track’s album field. */
const CAROUSEL_PLAYLIST_FALLBACK_IDS = [
  "37i9dQZEVXbMDoHDwVN2tF", // Top 50 — Global
  "37i9dQZEVXbNG2KDcFcKOF", // Top Songs — Global
] as const;

const TARGET_UNIQUE_ALBUMS = 20;

function resolvePlaylistId(): string {
  const fromEnv =
    process.env.BILLBOARD_CAROUSEL_PLAYLIST_ID?.trim() ||
    process.env.NEXT_PUBLIC_BILLBOARD_CAROUSEL_PLAYLIST_ID?.trim();
  return fromEnv || BILLBOARD_CAROUSEL_PLAYLIST_ID_DEFAULT;
}

function uniquePlaylistCandidates(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [resolvePlaylistId(), ...CAROUSEL_PLAYLIST_FALLBACK_IDS]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

type SpotifyAlbum = {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
};

type PlaylistTrackItem = {
  track: {
    album?: SpotifyAlbum;
  } | null;
};

function albumToCard(album: SpotifyAlbum): AlbumCard | null {
  if (!album.images?.length) return null;
  return {
    id: album.id,
    name: album.name,
    artist: album.artists[0]?.name || "Unknown",
    image: album.images[0]?.url || "",
    source: "spotify" as const,
  };
}

async function fetchPlaylistAlbums(
  accessToken: string,
  playlistId: string,
): Promise<AlbumCard[]> {
  const seen = new Set<string>();
  const out: AlbumCard[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`;

  while (url && out.length < TARGET_UNIQUE_ALBUMS) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Spotify playlist fetch failed: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as {
      items?: PlaylistTrackItem[];
      next?: string | null;
    };

    for (const item of data.items ?? []) {
      const album = item.track?.album;
      if (!album?.id || seen.has(album.id)) continue;
      seen.add(album.id);
      const card = albumToCard(album);
      if (card) out.push(card);
      if (out.length >= TARGET_UNIQUE_ALBUMS) break;
    }

    url = data.next ?? null;
  }

  return out;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionToken = (session as { accessToken?: string } | null)?.accessToken;

    let token: string | null = null;
    try {
      token = await getClientCredentialsToken();
    } catch {
      token = sessionToken ?? null;
    }
    if (!token) {
      return NextResponse.json({ error: "Spotify unavailable" }, { status: 503 });
    }

    let lastFailure: Error | null = null;
    let bestPartial: { albums: AlbumCard[]; playlistId: string } | null = null;

    for (const playlistId of uniquePlaylistCandidates()) {
      try {
        let albums = await fetchPlaylistAlbums(token, playlistId);
        if (albums.length < TARGET_UNIQUE_ALBUMS && sessionToken && sessionToken !== token) {
          albums = await fetchPlaylistAlbums(sessionToken, playlistId);
        }
        if (albums.length >= TARGET_UNIQUE_ALBUMS) {
          return NextResponse.json({
            albums: albums.slice(0, TARGET_UNIQUE_ALBUMS),
            playlistId,
          });
        }
        if (!bestPartial || albums.length > bestPartial.albums.length) {
          bestPartial = { albums, playlistId };
        }
      } catch (e) {
        lastFailure = e instanceof Error ? e : new Error(String(e));
        continue;
      }
    }

    if (bestPartial && bestPartial.albums.length > 0) {
      return NextResponse.json(
        {
          error: `Could not collect ${TARGET_UNIQUE_ALBUMS} unique albums from any fallback (best: ${bestPartial.albums.length} from ${bestPartial.playlistId}).`,
          albums: bestPartial.albums,
          playlistId: bestPartial.playlistId,
        },
        { status: 422 },
      );
    }

    const message =
      lastFailure?.message ??
      `Could not load ${TARGET_UNIQUE_ALBUMS} unique albums from carousel playlists.`;
    return NextResponse.json({ error: message }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}