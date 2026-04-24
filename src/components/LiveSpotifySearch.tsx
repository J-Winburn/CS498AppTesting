"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, LibraryBig, Plus, Search, X } from "lucide-react";
import { GENRE_CARDS } from "@/lib/genres";
import type { Album, SearchResponse, Track } from "@/types/spotify";

export default function LiveSpotifySearch({
  placeholder = "Search artists, tracks, albums",
  className = "",
  variant = "default",
  showRecentOnEmpty = false,
  /** When set (e.g. from `/search?q=`), seeds the input and opens live results */
  initialQuery,
}: {
  placeholder?: string;
  className?: string;
  variant?: "default" | "hero" | "browse";
  showRecentOnEmpty?: boolean;
  initialQuery?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse>({
    tracks: [],
    artists: [],
    albums: [],
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!showRecentOnEmpty) return;
    try {
      const raw = window.localStorage.getItem("tuneheadz.search.recent");
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 8));
    } catch {
      // ignore malformed local storage
    }
  }, [showRecentOnEmpty]);

  useEffect(() => {
    const q = initialQuery?.trim();
    if (!q) return;
    setQuery(q);
    setOpen(true);
    setGenreOpen(false);
  }, [initialQuery]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setGenreOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults({ tracks: [], artists: [], albums: [] });
      setError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q, type: "all" })}`);
        const data = (await res.json()) as SearchResponse;
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [query, open]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const names = [
      ...results.artists.map((a) => a.name),
      ...results.tracks.map((t) => t.name),
      ...results.albums.map((a) => a.name),
    ];
    return [...new Set(names.filter((n) => n.toLowerCase().includes(q)).slice(0, 5))];
  }, [query, results]);

  const featuredArtist = results.artists[0];
  const artistAlbums = useMemo(() => {
    if (!featuredArtist) return [] as Album[];
    const name = featuredArtist.name.toLowerCase();
    return results.albums.filter((album) =>
      album.artists.some((artist) => artist.name.toLowerCase() === name),
    );
  }, [featuredArtist, results.albums]);
  const latestDrop = artistAlbums[0] ?? results.albums[0];
  const relatedTracks = results.tracks.filter((track) =>
    featuredArtist
      ? track.artists.some((artist) => artist.name === featuredArtist.name)
      : true,
  );
  const relatedAlbums = results.albums.filter((album) => album.id !== latestDrop?.id);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    if (showRecentOnEmpty) {
      const next = [q, ...recentSearches.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      setRecentSearches(next);
      window.localStorage.setItem("tuneheadz.search.recent", JSON.stringify(next));
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const isBrowseBar = variant === "browse";

  const pillBarClasses = isBrowseBar
    ? "flex w-full min-w-0 items-center gap-3 rounded-full border border-[#333] bg-[#242424] px-4 py-2.5 text-[#b3b3b3] sm:px-5 sm:py-3"
    : "flex w-full items-center gap-3 rounded-full border border-[#666]/70 bg-[#25272c] px-5 py-3 text-[#d5dbe5]";

  const pillBar = (
    <div className={pillBarClasses}>
      <Search
        size={18}
        className={
          isBrowseBar ? "shrink-0 text-[#b3b3b3]" : "shrink-0 text-[#cfd6df]"
        }
      />
      <span
        className={
          isBrowseBar
            ? "text-2xl leading-none text-[#f4f6fa]/50"
            : "text-2xl leading-none text-[#f4f6fa]/90"
        }
      >
        |
      </span>
      <input
        value={query}
        onFocus={() => {
          setOpen(true);
          setGenreOpen(false);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setGenreOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setOpen(false);
            setGenreOpen(false);
          }
        }}
        placeholder={placeholder}
        className={
          isBrowseBar
            ? "min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-[#8c8c8c] focus:outline-none"
            : "min-w-0 flex-1 w-full bg-transparent text-base text-white placeholder:text-[#aab4c3] focus:outline-none"
        }
      />
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setResults({ tracks: [], artists: [], albums: [] });
        }}
        className={
          isBrowseBar
            ? "shrink-0 text-[#b3b3b3] transition hover:text-white"
            : "shrink-0 text-[#cfd6df] transition hover:text-white"
        }
        aria-label="Clear search"
      >
        <X size={20} />
      </button>
      <span
        className={
          isBrowseBar ? "h-6 w-px shrink-0 bg-[#4a4a4a]" : "h-6 w-px shrink-0 bg-[#6d7380]"
        }
      />
      {isBrowseBar ? (
        <button
          type="button"
          onClick={() => {
            setGenreOpen((g) => !g);
            setOpen(false);
          }}
          aria-expanded={genreOpen}
          aria-controls="search-genre-browse-panel"
          aria-label="Browse genres"
          className={`flex shrink-0 items-center justify-center rounded-md p-0.5 transition-colors duration-200 ease-out motion-safe:transition-transform motion-safe:duration-200 ${
            genreOpen
              ? "text-[#fb3d93] motion-safe:scale-105"
              : "text-[#b3b3b3] hover:text-white motion-safe:active:scale-95"
          }`}
        >
          <LibraryBig size={20} strokeWidth={2} />
        </button>
      ) : (
        <LibraryBig size={20} className="shrink-0 text-[#cfd6df]" />
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {variant === "hero" ? (
        <div className="group rounded-2xl border border-[#2a2a34] bg-[#15151d]/80 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur transition focus-within:border-[#3a3a48] focus-within:bg-[#181822]">
          <input
            ref={heroInputRef}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            aria-label="Search music"
            className="w-full bg-transparent text-base text-white placeholder:text-[#7a8595] focus:outline-none md:text-lg"
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Open search suggestions"
              onClick={() => {
                setOpen(true);
                queueMicrotask(() => heroInputRef.current?.focus());
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a34] text-[#a8b6c7] transition hover:border-[#3a3a48] hover:text-white"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={submit}
              aria-label="Search"
              disabled={!query.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fb3d93] text-white shadow-md shadow-[#fb3d93]/30 transition hover:bg-[#ff5aa6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ) : variant === "browse" ? (
        <div className="flex w-full items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#333] bg-[#242424] text-[#b3b3b3] transition hover:bg-[#2a2a2a] hover:text-white sm:h-11 sm:w-11"
            aria-label="Home"
          >
            <Home size={20} strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">{pillBar}</div>
        </div>
      ) : (
        pillBar
      )}

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-3 rounded-2xl border border-[#4f5561] bg-[#26282d] shadow-2xl">
          <div className="th-subtle-scroll max-h-[65vh] overflow-y-auto p-4">
            <section>
              <div className="space-y-2">
                {loading ? (
                  <>
                    <div className="h-12 animate-pulse rounded-lg bg-white/5" />
                    <div className="h-12 animate-pulse rounded-lg bg-white/5" />
                    <div className="h-12 animate-pulse rounded-lg bg-white/5" />
                  </>
                ) : !query.trim() && showRecentOnEmpty ? (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#d7deea]">Recent searches</p>
                      {recentSearches.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRecentSearches([]);
                            window.localStorage.removeItem("tuneheadz.search.recent");
                          }}
                          className="text-xs uppercase tracking-[0.12em] text-[#8c97a8] hover:text-white"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    {recentSearches.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[#4a5161] p-3 text-sm text-[#8c97a8]">
                        No recent searches yet.
                      </p>
                    ) : (
                      recentSearches.map((item) => (
                        <button
                          key={item}
                          onClick={() => {
                            setQuery(item);
                          }}
                          className="flex w-full items-center gap-4 rounded-lg p-2 text-left transition hover:bg-[#31353d]"
                        >
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#23262c] text-[#cdd4de]">
                            <Search size={22} />
                          </span>
                          <span className="text-[1.1rem] font-medium text-[#e8edf5]">{item}</span>
                        </button>
                      ))
                    )}
                  </>
                ) : suggestions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#4a5161] p-3 text-sm text-[#8c97a8]">
                    Start typing to see live Spotify suggestions.
                  </p>
                ) : (
                  <>
                    {suggestions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setQuery(item)}
                        className="flex w-full items-center gap-4 rounded-lg p-2 text-left transition hover:bg-[#31353d]"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#23262c] text-[#cdd4de]">
                          <Search size={22} />
                        </span>
                        <span className="text-[1.1rem] font-medium text-[#e8edf5]">{item}</span>
                      </button>
                    ))}

                    {featuredArtist ? (
                      <Link
                        href={`/artist/${encodeURIComponent(featuredArtist.id)}`}
                        onClick={() => setOpen(false)}
                        className="mt-3 flex items-center gap-3 rounded-xl border border-[#4a5161] bg-[#2f343c] p-3 transition hover:border-[#fb3d93]/50"
                      >
                        <img
                          src={featuredArtist.images?.[0]?.url || "https://placehold.co/64x64/22252d/f0f4fb?text=%E2%99%AB"}
                          alt={featuredArtist.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-3xl font-semibold text-[#f4f7fb]">
                            {featuredArtist.name}
                          </p>
                          <p className="truncate text-sm text-[#aeb8c8]">Artist</p>
                        </div>
                        <span className="ml-auto rounded-full border border-[#6b7180] px-5 py-1.5 text-3xl font-semibold text-white">
                          Follow
                        </span>
                      </Link>
                    ) : null}

                    {latestDrop ? (
                      <Link
                        href={`/album/${encodeURIComponent(latestDrop.id)}?source=spotify`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-[#4a5161] bg-[#3a3d44] p-2 transition hover:border-[#fb3d93]/50"
                      >
                        <img
                          src={latestDrop.images?.[0]?.url || "https://placehold.co/72x72/22252d/f0f4fb?text=%E2%99%AB"}
                          alt={latestDrop.name}
                          className="h-16 w-16 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-2xl font-medium text-[#f4f7fb] underline">
                            {latestDrop.name}
                          </p>
                          <p className="truncate text-sm text-[#aeb8c8]">
                            Album - {latestDrop.artists.map((a) => a.name).join(", ")}
                          </p>
                        </div>
                      </Link>
                    ) : null}

                    <div className="pt-1">
                      {[...relatedAlbums.slice(0, 3), ...relatedTracks.slice(0, 3)].map((item) => {
                        const isTrack = (item as Track).album !== undefined && (item as Track).name !== undefined && (item as any).artists !== undefined && !(item as any).images;
                        if (isTrack) {
                          const track = item as Track;
                          return (
                            <Link
                              key={`track-${track.id}`}
                              href={`/track/${encodeURIComponent(track.id)}`}
                              onClick={() => setOpen(false)}
                              className="mt-2 flex items-center gap-3 rounded-lg border border-[#444c5e] bg-[#2d3139] p-2 transition hover:border-[#fb3d93]/50"
                            >
                              <img
                                src={track.album?.images?.[0]?.url || "https://placehold.co/54x54/22252d/f0f4fb?text=%E2%99%AA"}
                                alt={track.name}
                                className="h-12 w-12 rounded object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-lg font-medium text-[#f4f7fb]">{track.name}</p>
                                <p className="truncate text-sm text-[#aeb8c8]">
                                  Song - {track.artists.map((a) => a.name).join(", ")}
                                </p>
                              </div>
                            </Link>
                          );
                        }
                        const album = item as Album;
                        return (
                          <Link
                            key={`album-${album.id}`}
                            href={`/album/${encodeURIComponent(album.id)}?source=spotify`}
                            onClick={() => setOpen(false)}
                            className="mt-2 flex items-center gap-3 rounded-lg border border-[#444c5e] bg-[#2d3139] p-2 transition hover:border-[#fb3d93]/50"
                          >
                            <img
                              src={album.images?.[0]?.url || "https://placehold.co/54x54/22252d/f0f4fb?text=%E2%99%AB"}
                              alt={album.name}
                              className="h-12 w-12 rounded object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-lg font-medium text-[#f4f7fb]">{album.name}</p>
                              <p className="truncate text-sm text-[#aeb8c8]">
                                Album - {album.artists.map((a) => a.name).join(", ")}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
          {error ? <p className="px-4 pb-4 text-sm text-red-300">{error}</p> : null}
        </div>
      ) : null}

      {genreOpen && variant === "browse" ? (
        <div
          id="search-genre-browse-panel"
          role="region"
          aria-label="Browse by genre"
          className="th-genre-dropdown-panel absolute left-0 right-0 z-50 mt-3 rounded-2xl border border-[#4f5561] bg-[#26282d] shadow-2xl motion-reduce:shadow-xl"
        >
          <div className="th-subtle-scroll max-h-[70vh] overflow-y-auto p-4 md:p-5">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Browse all
            </h2>
            <div className="th-genre-dropdown-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {GENRE_CARDS.map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/search/genre/${genre.slug}`}
                  onClick={() => setGenreOpen(false)}
                  className={`th-genre-dropdown-card relative overflow-hidden rounded-xl bg-linear-to-br ${genre.gradient} p-4 shadow-md motion-safe:hover:shadow-lg`}
                >
                  <span className="text-2xl font-semibold tracking-tight text-white/95 md:text-3xl">
                    {genre.title}
                  </span>
                  <div className="absolute -bottom-5 -right-4 h-20 w-20 rotate-12 rounded-md bg-black/20" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
