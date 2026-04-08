import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    
    // We expect the body to have { id, type, name, artists, album, images }
    // type can be "track", "artist", "album"
    const type = body.type || "track";
    const spotifyId = body.id;
    const name = body.name;
    
    let artistsArray: string[] = [];
    let albumName: string | null = null;
    let imageUrl: string | null = null;

    if (type === "track") {
      artistsArray = body.artists?.map((a: any) => a.name) || [];
      albumName = body.album?.name || null;
      imageUrl = body.album?.images?.[0]?.url || null;
    } else if (type === "artist") {
      artistsArray = ["Artist"];
      imageUrl = body.images?.[0]?.url || null;
    } else if (type === "album") {
      artistsArray = body.artists?.map((a: any) => a.name) || [];
      albumName = "Album";
      imageUrl = body.images?.[0]?.url || null;
    }

    const saved = await prisma.savedTrack.upsert({
      where: {
        userId_spotifyTrackId: {
          userId: user.id,
          spotifyTrackId: spotifyId,
        },
      },
      create: {
        userId: user.id,
        spotifyTrackId: spotifyId,
        itemType: type,
        trackName: name,
        artists: JSON.stringify(artistsArray),
        albumName: albumName,
        imageUrl: imageUrl,
      },
      update: {
        itemType: type,
        trackName: name,
        artists: JSON.stringify(artistsArray),
        albumName: albumName,
        imageUrl: imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      saved,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save item" },
      { status: 500 }
    );
  }
}
