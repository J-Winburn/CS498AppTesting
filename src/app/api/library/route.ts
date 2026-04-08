import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all saved tracks
    const savedTracks = await prisma.savedTrack.findMany({
      where: { userId: user.id },
    });

    // Get all ratings
    const ratings = await prisma.rating.findMany({
      where: { userId: user.id },
    });

    // Combine them into a single list of unique items
    const libraryMap = new Map<string, any>();

    // Add saved tracks
    for (const track of savedTracks) {
      libraryMap.set(track.spotifyTrackId, {
        id: track.id,
        spotifyTrackId: track.spotifyTrackId,
        type: track.itemType || "track",
        trackName: track.trackName,
        artists: track.artists,
        albumName: track.albumName,
        imageUrl: track.imageUrl,
        savedAt: track.savedAt,
        isSaved: true,
        rating: 0,
      });
    }

    // Add or update with ratings
    for (const rating of ratings) {
      if (libraryMap.has(rating.spotifyId)) {
        // Update existing
        const existing = libraryMap.get(rating.spotifyId);
        existing.rating = rating.rating;
        // Keep the most recent date for sorting
        if (new Date(rating.updatedAt) > new Date(existing.savedAt)) {
          existing.savedAt = rating.updatedAt;
        }
      } else {
        // Add new item from rating
        libraryMap.set(rating.spotifyId, {
          id: rating.id,
          spotifyTrackId: rating.spotifyId,
          type: rating.type,
          trackName: rating.name || "Unknown",
          // Artists is stored as a JSON string array in SavedTrack, so we format subtitle as a JSON array string
          artists: JSON.stringify(rating.subtitle ? [rating.subtitle] : []),
          albumName: rating.type === "track" ? null : rating.type, // Just a fallback
          imageUrl: rating.imageUrl,
          savedAt: rating.updatedAt,
          isSaved: false,
          rating: rating.rating,
        });
      }
    }

    const library = Array.from(libraryMap.values()).sort((a, b) => {
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });

    return NextResponse.json({ library });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch library" },
      { status: 500 }
    );
  }
}
