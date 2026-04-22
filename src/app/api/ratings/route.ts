import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/** Ratings were Prisma-backed; stub until migrated to Supabase. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spotifyId = searchParams.get("spotifyId");

    if (spotifyId) {
      return NextResponse.json({ rating: 0 });
    }

    return NextResponse.json({ ratings: [] });
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
    const { rating } = body;

    if (rating === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    return NextResponse.json({ message: "Rating acknowledged (not persisted)", rating });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
