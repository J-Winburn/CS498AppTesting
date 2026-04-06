import { NextRequest, NextResponse } from "next/server";

type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

type ReplicatePrediction = {
  id: string;
  status: PredictionStatus;
  output?: string | string[];
  error?: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Missing Replicate API token." }, { status: 500 });
  }

  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch prediction status." }, { status: 502 });
  }

  const prediction = (await response.json()) as ReplicatePrediction;

  return NextResponse.json({
    status: prediction.status,
    audioUrl: Array.isArray(prediction.output) ? prediction.output[0] : (prediction.output ?? null),
    error: prediction.error ?? null,
  });
}
