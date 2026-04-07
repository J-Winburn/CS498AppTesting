"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Album = {
  id: string;
  name: string;
  artist: string;
  image: string;
};

type SearchResult = {
  albums: Album[];
  error?: string;
};

type ApiSource = "spotify" | "musicbrainz";

export default function Landing() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [searching, setSearching] = useState(false);
  const [apiSource, setApiSource] = useState<ApiSource>("spotify");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRandomAlbums();
  }, []);

  const fetchRandomAlbums = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/albums/random");
      const data = (await response.json()) as { albums: Album[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to fetch albums");
      // Filter out albums without images
      const validAlbums = data.albums.filter((album) => album.image && album.image.trim());
      if (validAlbums.length === 0) throw new Error("No albums with images available");
      setAlbums(validAlbums);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load albums");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        source: apiSource,
      });
      const response = await fetch(`/api/albums/search?${params}`);
      const data = (await response.json()) as SearchResult;
      if (!response.ok) throw new Error(data.error || "Search failed");
      // Filter out albums without images
      const validAlbums = data.albums.filter((album) => album.image && album.image.trim());
      setSearchResults(validAlbums);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const displayAlbums = searchResults.length > 0 ? searchResults : albums;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .carousel-scroll-left {
          animation: scrollLeft 40s linear infinite;
        }
        .carousel-scroll-right {
          animation: scrollRight 40s linear infinite;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-zinc-800 px-8 py-4 sticky top-0 bg-black z-10">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-3xl font-bold">
            Tune 🎧
          </Link>

          <nav className="flex items-center gap-8">
            <Link href="#" className="text-sm font-semibold hover:text-green-500 transition">
              SIGN IN
            </Link>
            <Link href="#" className="text-sm font-semibold hover:text-green-500 transition">
              CREATE ACCOUNT
            </Link>
            <Link href="#" className="text-sm font-semibold hover:text-green-500 transition">
              ALBUMS
            </Link>
            <Link href="#" className="text-sm font-semibold hover:text-green-500 transition">
              LISTS
            </Link>
            <Link href="#" className="text-sm font-semibold hover:text-green-500 transition">
              JOURNAL
            </Link>
          </nav>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="rounded-full bg-zinc-700 px-4 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-full bg-green-500 p-2 text-black hover:bg-green-600 disabled:opacity-50"
            >
              🔍
            </button>
          </form>
        </div>

        {/* API Source Toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">Search with:</span>
          <button
            onClick={() => setApiSource("spotify")}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              apiSource === "spotify"
                ? "bg-green-500 text-black"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            Spotify
          </button>
          <button
            onClick={() => setApiSource("musicbrainz")}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              apiSource === "musicbrainz"
                ? "bg-green-500 text-black"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            MusicBrainz
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        {error && (
          <div className="mx-8 mb-6 rounded bg-red-900/50 p-4 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading albums...</div>
        ) : displayAlbums.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">No albums found</div>
        ) : (
          <>
            {/* Carousel Row 1 - Scrolls Left */}
            <div className="mb-8 overflow-hidden">
              <div className="flex gap-4 carousel-scroll-left" style={{ width: "200%" }}>
                {[...displayAlbums.slice(0, 10), ...displayAlbums.slice(0, 10)].map(
                  (album, idx) => (
                    <div
                      key={`row1-${idx}`}
                      className="shrink-0 w-32 h-40 rounded-lg overflow-hidden bg-zinc-800 hover:shadow-lg hover:shadow-green-500/50 transition cursor-pointer"
                    >
                      <img
                        src={album.image}
                        alt={album.name}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 flex flex-col justify-between h-8">
                        <p className="truncate text-xs font-semibold">{album.name}</p>
                        <p className="truncate text-xs text-zinc-400">{album.artist}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Carousel Row 2 - Scrolls Right */}
            <div className="overflow-hidden">
              <div className="flex gap-4 carousel-scroll-right" style={{ width: "200%" }}>
                {[...displayAlbums.slice(10, 20), ...displayAlbums.slice(10, 20)].map(
                  (album, idx) => (
                    <div
                      key={`row2-${idx}`}
                      className="shrink-0 w-32 h-40 rounded-lg overflow-hidden bg-zinc-800 hover:shadow-lg hover:shadow-green-500/50 transition cursor-pointer"
                    >
                      <img
                        src={album.image}
                        alt={album.name}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 flex flex-col justify-between h-8">
                        <p className="truncate text-xs font-semibold">{album.name}</p>
                        <p className="truncate text-xs text-zinc-400">{album.artist}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {/* CTA Text */}
        <div className="mt-16 text-center px-8">
          <h2 className="text-4xl font-bold">Rate Albums And Songs.</h2>
          <p className="mt-4 text-2xl text-zinc-400">
            Save Those You Want To Listen To.
          </p>
        </div>

        {/* Back to Search Button */}
        <div className="mt-12 text-center pb-8">
          <Link
            href="/"
            className="inline-block rounded-lg bg-green-500 px-8 py-3 font-semibold text-black hover:bg-green-600 transition"
          >
            Back to Search
          </Link>
        </div>
      </main>
    </div>
  );
}