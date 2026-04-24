"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type TimeRange = "short_term" | "medium_term" | "long_term";
type ActiveView = "artists" | "tracks";

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
    external_urls: { spotify: string };
  };
  popularity: number;
  external_urls: { spotify: string };
  duration_ms: number;
}

interface StatsData {
  top_artists: SpotifyArtist[];
  top_tracks: SpotifyTrack[];
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: "Past 4 Weeks",
  medium_term: "Past 6 Months",
  long_term: "Past Year",
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [activeView, setActiveView] = useState<ActiveView>("artists");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const fetchStats = useCallback(async (range: TimeRange) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/user/spotify-stats?time_range=${range}`);

      if (res.status === 429) {
        const retry = parseInt(res.headers.get("Retry-After") || "10", 10);
        setRetryAfter(retry);
        setError(`Rate limited by Spotify. Retrying in ${retry}s…`);
        setTimeout(() => {
          setRetryAfter(null);
          fetchStats(range);
        }, retry * 1000);
        return;
      }

      if (res.status === 403) {
        setError("no-spotify");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error || "Failed to load stats.");
        return;
      }

      const json = (await res.json()) as StatsData;
      setData({
        top_artists: (json.top_artists ?? []).map((artist) => ({
          ...artist,
          images: artist.images ?? [],
          genres: artist.genres ?? [],
          external_urls: artist.external_urls ?? { spotify: "#" },
        })),
        top_tracks: (json.top_tracks ?? []).map((track) => ({
          ...track,
          artists: track.artists ?? [],
          album: {
            name: track.album?.name ?? "Unknown album",
            images: track.album?.images ?? [],
            external_urls: track.album?.external_urls ?? { spotify: "#" },
          },
          external_urls: track.external_urls ?? { spotify: "#" },
        })),
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectSpotify = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/spotify/link", { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error || "Failed to disconnect Spotify.");
        return;
      }

      setData(null);
      setError("no-spotify");
    } catch {
      setError("Failed to disconnect Spotify.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats(timeRange);
    }
  }, [status, timeRange, fetchStats]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#07090f] flex items-center justify-center">
        <p className="text-zinc-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090f] py-10 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-50">Your Spotify Stats</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Your top artists and tracks from Spotify.{" "}
            <span className="text-zinc-500 text-xs">Powered by Spotify</span>
          </p>
        </div>

        {/* Time range tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([range, label]) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-[#fb3d93] text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="mb-6 flex gap-1 rounded-xl bg-zinc-900 p-1 w-fit">
          {(["artists", "tracks"] as ActiveView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`rounded-lg px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeView === view
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {!loading && !error && data && (
          <div className="mb-6">
            <button
              type="button"
              onClick={disconnectSpotify}
              className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
            >
              Disconnect Spotify
            </button>
          </div>
        )}

        {/* Error states */}
        {error === "no-spotify" && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
            <p className="text-lg font-semibold text-zinc-100 mb-2">Spotify not connected</p>
            <p className="text-sm text-zinc-400 mb-5">
              Link your Spotify account to view your listening stats.
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = "/api/spotify/link/start"; }}
              className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1ed760] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Link Spotify Account
            </button>
          </div>
        )}

        {error && error !== "no-spotify" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <ul className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 rounded-2xl bg-zinc-900/60 p-3 animate-pulse">
                <div className="shrink-0 rounded-xl bg-zinc-800 w-14 h-14" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-48 rounded bg-zinc-800" />
                  <div className="h-3 w-32 rounded bg-zinc-800/70" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Artists list */}
        {!loading && !error && data && activeView === "artists" && (
          <ol className="space-y-3">
            {data.top_artists.length === 0 && (
              <p className="text-zinc-500 text-sm">No data available for this time range.</p>
            )}
            {data.top_artists.map((artist, index) => (
              <li key={artist.id}>
                <a
                  href={artist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 p-3 transition-colors group"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {index + 1}
                  </span>
                  {artist.images[0]?.url ? (
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                      No img
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-100 truncate group-hover:text-white">
                      {artist.name}
                    </p>
                    {artist.genres.length > 0 && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {artist.genres.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500 group-hover:text-zinc-400">
                    Popularity {artist.popularity}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}

        {/* Tracks list */}
        {!loading && !error && data && activeView === "tracks" && (
          <ol className="space-y-3">
            {data.top_tracks.length === 0 && (
              <p className="text-zinc-500 text-sm">No data available for this time range.</p>
            )}
            {data.top_tracks.map((track, index) => (
              <li key={track.id}>
                <a
                  href={track.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 p-3 transition-colors group"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {index + 1}
                  </span>
                  {track.album.images[0]?.url ? (
                    <img
                      src={track.album.images[0].url}
                      alt={track.album.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                      No img
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-100 truncate group-hover:text-white">
                      {track.name}
                    </p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500 group-hover:text-zinc-400">
                    {formatDuration(track.duration_ms)}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
