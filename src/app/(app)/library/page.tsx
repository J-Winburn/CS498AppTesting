"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StarRating from "@/components/StarRating";

interface LibraryItem {
  id: string;
  spotifyTrackId: string;
  type: string;
  trackName: string;
  artists: string;
  albumName: string | null;
  imageUrl: string | null;
  savedAt: string;
  isSaved: boolean;
  rating: number;
}

export default function LibraryPage() {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch("/api/library");
        if (!response.ok) {
          throw new Error("Failed to fetch library");
        }
        const data = (await response.json()) as { library: LibraryItem[] };
        setLibrary(data.library);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  const handleRemove = async (spotifyTrackId: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        const response = await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotifyTrackId }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove track");
        }
      }

      // Also remove rating if it exists
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyId: spotifyTrackId, type: "track", rating: 0 }),
      });

      setLibrary((prev) =>
        prev.filter((item) => item.spotifyTrackId !== spotifyTrackId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 text-zinc-50">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">My Library</h1>
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
          <p className="text-zinc-400">Loading library...</p>
        ) : library.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-8 text-center">
            <p className="text-zinc-400">Your library is empty. Search and save/rate tracks to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {library.map((item) => {
              let artists: string[] = [];
              try {
                artists = JSON.parse(item.artists);
              } catch (e) {
                // Ignore parsing errors
              }

              return (
                <article
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-4"
                >
                  <img
                    src={item.imageUrl || "https://placehold.co/80x80/18181b/f4f4f5?text=♪"}
                    alt={item.trackName}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{item.trackName}</h3>
                      {!item.isSaved && item.rating > 0 && (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          Rated
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300">
                      {artists.join(", ")}
                    </p>
                    <p className="text-sm text-zinc-500 mb-2">{item.albumName}</p>
                    <StarRating 
                      spotifyId={item.spotifyTrackId} 
                      type={item.type as any || "track"} 
                      name={item.trackName}
                      imageUrl={item.imageUrl || undefined}
                      subtitle={artists.join(", ")}
                      initialRating={item.rating}
                      onRatingChange={(newRating) => {
                        // If it's not saved and rating goes to 0, remove it from the list
                        if (!item.isSaved && newRating === 0) {
                          setLibrary((prev) => prev.filter((i) => i.spotifyTrackId !== item.spotifyTrackId));
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(item.spotifyTrackId, item.isSaved)}
                    className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 transition"
                  >
                    Remove
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
