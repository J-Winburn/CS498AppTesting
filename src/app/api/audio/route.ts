import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch audio." }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "audio/wav";
  const buffer = await response.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
