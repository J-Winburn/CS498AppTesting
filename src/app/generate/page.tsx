"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

const DURATIONS = [5, 10, 15, 30] as const;
type Duration = (typeof DURATIONS)[number];

type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

// Progress % targets per status — fills the rest smoothly via elapsed time
const STATUS_PROGRESS: Record<PredictionStatus, number> = {
  starting: 15,
  processing: 60,
  succeeded: 100,
  failed: 100,
  canceled: 100,
};

const POLL_INTERVAL_MS = 2000;
const ESTIMATED_DURATION_MS = 40_000; // ~40s typical for MusicGen

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<Duration>(10);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PredictionStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Smoothly animate progress toward the target for the current status
  useEffect(() => {
    if (!loading || status === null) return;

    const target = STATUS_PROGRESS[status];

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const timeFraction = Math.min(elapsed / ESTIMATED_DURATION_MS, 1);

      // Interpolate between previous milestone and current target using elapsed time
      setProgress((prev) => {
        const next = prev + (target - prev) * 0.04 + timeFraction * 0.3;
        return Math.min(next, target);
      });

      if (status !== "succeeded" && status !== "failed" && status !== "canceled") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [loading, status]);

  const stopPolling = () => {
    if (pollRef.current !== null) clearTimeout(pollRef.current);
  };

  const pollStatus = (id: string) => {
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/generate/${id}`);
        const data = (await res.json()) as {
          status: PredictionStatus;
          audioUrl: string | null;
          error: string | null;
        };

        setStatus(data.status);

        if (data.status === "succeeded" && data.audioUrl) {
          setProgress(100);
          setAudioUrl(data.audioUrl);
          setLoading(false);
        } else if (data.status === "failed" || data.status === "canceled") {
          setError(data.error ?? "Generation failed. Please try again.");
          setLoading(false);
        } else {
          pollStatus(id);
        }
      } catch {
        setError("Lost connection while checking status. Please try again.");
        setLoading(false);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prompt.trim()) {
      setError("Please describe the music you want to generate.");
      return;
    }

    stopPolling();
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setStatus("starting");
    setProgress(0);
    startTimeRef.current = Date.now();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), duration }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "Failed to start generation.");
      }

      pollStatus(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setLoading(false);
    }
  };

  const statusLabel: Record<PredictionStatus, string> = {
    starting: "Starting up…",
    processing: "Generating your track…",
    succeeded: "Done!",
    failed: "Failed",
    canceled: "Canceled",
  };

  return (
    <main className="min-h-screen px-4 py-10 text-zinc-50">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm font-medium text-green-300">
              AI Music Generation
            </span>
            <Link
              href="/"
              className="text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              ← Back to Search
            </Link>
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Generate Music with AI
          </h1>
          <p className="mt-3 text-sm text-zinc-300 md:text-base">
            Describe the music you want and let AI generate it. Works best
            with genre, mood, tempo, and instruments.
          </p>

          <form onSubmit={handleGenerate} className="mt-6 space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. chill lo-fi hip hop, 80 BPM, warm vinyl crackle, rainy evening mood"
              rows={3}
              disabled={loading}
              className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-base outline-none transition focus:border-green-400 disabled:opacity-50"
            />

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-zinc-400">Duration:</span>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={loading}
                  onClick={() => setDuration(d)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    duration === d
                      ? "bg-green-500 text-black"
                      : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-green-500 py-3 font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {loading ? "Generating…" : "Generate"}
            </button>
          </form>

          {loading && status ? (
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{statusLabel[status]}</span>
                <span className="tabular-nums text-zinc-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        {audioUrl ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="mb-4 text-xl font-semibold">Your Track</h2>
            <audio controls src={`/api/audio?url=${encodeURIComponent(audioUrl)}`} className="w-full" />
            <a
              href={`/api/audio?url=${encodeURIComponent(audioUrl)}`}
              download="generated-music.wav"
              className="mt-4 inline-block text-sm text-green-300 hover:text-green-200"
            >
              Download
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
