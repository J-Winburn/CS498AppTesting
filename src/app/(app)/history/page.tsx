"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface GeneratedTrack {
  id: string;
  prompt: string;
  duration: number;
  audioUrl: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<GeneratedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/history");
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }
        const data = (await response.json()) as { history: GeneratedTrack[] };
        setHistory(data.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete track");
      }

      setHistory((prev) => prev.filter((track) => track.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete track");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen px-4 py-10 text-zinc-50">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">Generation History</h1>
          <Link href="/search" className="text-[#fb3d93] hover:text-green-200">
            ← Back to Search
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-400">Loading history...</p>
        ) : history.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-8 text-center">
            <p className="text-zinc-400">No generated tracks yet. Start creating!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((track) => (
              <div
                key={track.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-400">{formatDate(track.createdAt)}</p>
                    <p className="mt-1 text-base font-semibold">{track.prompt}</p>
                    <p className="mt-1 text-sm text-zinc-400">Duration: {track.duration}s</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      track.status === "succeeded"
                        ? "bg-[#fb3d93]/20 text-[#fb3d93]"
                        : track.status === "failed"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {track.status}
                  </span>
                </div>

                {track.status === "succeeded" && track.audioUrl && (
                  <div className="mb-3 flex items-center gap-3">
                    <audio
                      controls
                      src={`/api/audio?url=${encodeURIComponent(track.audioUrl)}`}
                      className="flex-1"
                    />
                    <a
                      href={`/api/audio?url=${encodeURIComponent(track.audioUrl)}`}
                      download="generated-music.wav"
                      className="rounded-lg bg-[#fb3d93]/20 px-3 py-2 text-sm font-medium text-[#fb3d93] hover:bg-green-500/30 transition"
                    >
                      Download
                    </a>
                  </div>
                )}

                {track.error && (
                  <p className="mb-3 text-sm text-red-300">{track.error}</p>
                )}

                <button
                  onClick={() => handleDelete(track.id)}
                  className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
