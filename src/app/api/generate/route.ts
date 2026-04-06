import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
// Latest meta/musicgen version — update if Replicate publishes a newer one
const MUSICGEN_VERSION = "d684e88c99298f7cfc0db179f496f387184738367916b03f4833cb5e65cd9562";

export async function POST(request: NextRequest) {
  let prompt: string;
  let duration: number;

  try {
    const body = (await request.json()) as { prompt?: unknown; duration?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    duration = typeof body.duration === "number" && body.duration > 0 ? Math.min(body.duration, 30) : 8;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Please provide a prompt describing the music." }, { status: 400 });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing Replicate API token." }, { status: 500 });
  }

  try {
    const response = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: MUSICGEN_VERSION,
        input: {
          description: prompt,
          duration,
          model_version: "stereo-large",
          output_format: "mp3",
          normalization_strategy: "peak",
        },
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(body.detail ?? "Failed to create generation request.");
    }

    const prediction = (await response.json()) as { id: string };
    return NextResponse.json({ id: prediction.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
