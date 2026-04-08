import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spotifyId = searchParams.get("spotifyId");

    if (spotifyId) {
      // Get specific rating
      const rating = await prisma.rating.findUnique({
        where: {
          userId_spotifyId: {
            userId: session.user.id,
            spotifyId,
          },
        },
      });
      return NextResponse.json({ rating: rating?.rating || 0 });
    }

    // Get all ratings
    const ratings = await prisma.rating.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { spotifyId, type, rating, name, imageUrl, subtitle } = body;

    if (!spotifyId || !type || rating === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (rating === 0) {
      // Remove rating if set to 0
      await prisma.rating.deleteMany({
        where: {
          userId: session.user.id,
          spotifyId,
        },
      });
      return NextResponse.json({ message: "Rating removed", rating: 0 });
    }

    // Upsert rating
    const savedRating = await prisma.rating.upsert({
      where: {
        userId_spotifyId: {
          userId: session.user.id,
          spotifyId,
        },
      },
      update: {
        rating,
        name,
        imageUrl,
        subtitle,
      },
      create: {
        userId: session.user.id,
        spotifyId,
        type,
        rating,
        name,
        imageUrl,
        subtitle,
      },
    });

    return NextResponse.json({ message: "Rating saved", rating: savedRating.rating });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
