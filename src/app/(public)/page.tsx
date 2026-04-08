"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved || "dark";
    setTheme(initial);
    if (initial === "light") {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  }, []);

  const bgClass = theme === "light" ? "bg-white text-black" : "bg-black text-zinc-50";
  const navBorderClass = theme === "light" ? "border-zinc-200" : "border-zinc-800";
  const inputBgClass = theme === "light" ? "bg-zinc-100 text-black placeholder:text-zinc-600" : "bg-zinc-800 text-zinc-50 placeholder:text-zinc-500";
  const logoSrc = "/assets/logo-light.png";

  return (
    <main className={`min-h-screen ${bgClass}`}>
      {/* Navbar - Exact Layout */}
      <nav className={`border-b ${navBorderClass} px-8 py-2`}>
        <div className="flex items-center justify-between">
          {/* Logo - Clickable */}
          <Link href="/" className="flex-shrink-0 hover:opacity-80 transition">
            <img src={logoSrc} alt="TuneHeadz" className="h-24 w-auto" />
          </Link>

          {/* Menu Items */}
          <div className="flex items-center gap-12 text-sm font-semibold">
            {status !== "loading" && (
              session?.user ? (
                <Link href="/search" className="uppercase px-4 py-2 border-2 border-[#fb3d93] text-[#fb3d93] rounded-lg hover:bg-[#fb3d93] hover:text-white transition">
                  Go to App
                </Link>
              ) : (
                <>
                  <Link href="/signin" className="uppercase px-4 py-2 border-2 border-[#fb3d93] text-[#fb3d93] rounded-lg hover:bg-[#fb3d93] hover:text-white transition">
                    Sign In
                  </Link>
                  <Link href="/signup" className="uppercase hover:text-[#fb3d93] transition">
                    Create Account
                  </Link>
                </>
              )
            )}
            <Link href="/catalog" className="uppercase hover:text-[#fb3d93] transition">
              Catalog
            </Link>
            <Link href="/lists" className="uppercase hover:text-[#fb3d93] transition">
              Lists
            </Link>
            <Link href="/generate" className="uppercase hover:text-[#fb3d93] transition">
              Generate Music
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputBgClass} rounded-full py-2 pl-4 pr-10 w-48 focus:outline-none focus:ring-2 focus:ring-[#fb3d93]`}
              />
              <button className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme === "light" ? "text-zinc-600 hover:text-black" : "text-zinc-400 hover:text-zinc-200"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`px-8 py-16 text-center ${theme === "light" ? "text-black" : "text-white"}`}>
        <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight">
          The Social App<br />
          For Music Lovers
        </h1>
        <p className={`text-xl mb-12 max-w-2xl mx-auto ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
          Discover music, create AI tracks, and connect with other music enthusiasts
        </p>
      </section>

      {/* Features Section */}
      <section className={`px-8 py-20 ${theme === "light" ? "bg-zinc-50" : "bg-gradient-to-b from-zinc-900/50 to-black"}`}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div className={`text-center ${theme === "light" ? "text-black" : "text-white"}`}>
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-2xl font-bold mb-3">Discover</h3>
            <p className={theme === "light" ? "text-zinc-600" : "text-zinc-400"}>
              Search millions of songs and artists from Spotify
            </p>
          </div>

          {/* Feature 2 */}
          <div className={`text-center ${theme === "light" ? "text-black" : "text-white"}`}>
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-2xl font-bold mb-3">Generate</h3>
            <p className={theme === "light" ? "text-zinc-600" : "text-zinc-400"}>
              Create unique AI-powered music with simple descriptions
            </p>
          </div>

          {/* Feature 3 */}
          <div className={`text-center ${theme === "light" ? "text-black" : "text-white"}`}>
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold mb-3">Create</h3>
            <p className={theme === "light" ? "text-zinc-600" : "text-zinc-400"}>
              Build playlists and share with your music community
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
