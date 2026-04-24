"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function SpotifyLinkedPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const linked = searchParams.get("spotify_linked");
    const destination = new URL("/profile", window.location.origin);

    if (linked) {
      destination.searchParams.set("spotify_linked", linked);
    }

    // Hard navigate to avoid app-router transition stalls after OAuth callback.
    const timeoutId = window.setTimeout(() => {
      window.location.replace(`${destination.pathname}${destination.search}`);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Finishing Spotify connection...</h1>
        <p className="text-zinc-400">Taking you back to your profile.</p>
      </div>
    </main>
  );
}
