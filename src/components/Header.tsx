"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import HeroInlineSearch from "@/components/HeroInlineSearch";
import { useAlbumAmbient } from "@/components/AlbumAmbientProvider";
import { HERO_NAV_LINK_CLASS, HERO_NAV_USER_TRIGGER_CLASS } from "@/lib/hero-nav-styles";

export default function Header({
  initialSession,
}: {
  initialSession: Session | null;
}) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthed = mounted ? !!session?.user : !!initialSession?.user;

  const user = mounted ? session?.user : initialSession?.user;
  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Account";

  const navLinksCollapseClass = searchExpanded
    ? "max-md:pointer-events-none max-md:max-h-0 max-md:max-w-0 max-md:overflow-hidden max-md:opacity-0"
    : "";

  const albumAmbient = useAlbumAmbient();

  return (
    <header
      className={`th-app-header relative z-40 motion-safe:transition-[background,backdrop-filter,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none ${albumAmbient?.isAlbumAmbientActive ? "th-app-header--album-ambient" : ""}`}
    >
      <div className="th-shell grid grid-cols-2 grid-rows-[auto_auto] items-center gap-x-3 gap-y-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-1 sm:gap-x-4 md:py-3.5">
        <Link
          href="/"
          className="col-start-1 row-start-1 justify-self-start self-center transition hover:opacity-85"
        >
          <img
            src="/assets/logo.png"
            alt="TuneHeadz"
            className="h-[3.45rem] w-auto md:h-[3.7rem]"
          />
        </Link>

        <div className="col-start-2 row-start-1 justify-self-end self-center sm:col-start-3 sm:justify-self-end">
          <HeroInlineSearch onExpandedChange={setSearchExpanded} />
        </div>

        <nav
          className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 self-center sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-center sm:gap-x-4 md:gap-x-6"
          aria-label="Primary"
        >
          <div
            className={`flex flex-wrap items-center justify-center gap-x-3 motion-safe:transition-[opacity,max-width,margin] motion-safe:duration-[280ms] motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:gap-x-4 md:gap-x-6 ${navLinksCollapseClass}`}
          >
            {!isAuthed ? (
              <>
                <Link href="/signin" className={HERO_NAV_LINK_CLASS}>
                  Sign in
                </Link>
                <Link href="/signup" className={HERO_NAV_LINK_CLASS}>
                  Create account
                </Link>
              </>
            ) : null}

            <Link href="/search" className={HERO_NAV_LINK_CLASS}>
              Music
            </Link>
            <Link href="/history" className={HERO_NAV_LINK_CLASS}>
              Journal
            </Link>

            {isAuthed ? (
              <Link href="/lists" className={HERO_NAV_LINK_CLASS}>
                Lists
              </Link>
            ) : null}

            {isAuthed ? (
              <Link href="/stats" className={HERO_NAV_LINK_CLASS}>
                Stats
              </Link>
            ) : null}
          </div>

          {isAuthed ? (
            <div className="group relative shrink-0">
              <button
                type="button"
                className={HERO_NAV_USER_TRIGGER_CLASS}
                aria-haspopup="menu"
              >
                {displayName}
              </button>
              <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 w-56 min-w-[10rem] opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div
                  className="rounded-lg border border-[color:color-mix(in_srgb,var(--line)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--bg-2)_92%,#000)] py-1.5 shadow-lg shadow-black/25 ring-1 ring-white/[0.04]"
                  role="menu"
                >
                  <ul className="text-left text-[13px] font-medium normal-case tracking-normal text-[#d8e0e8]">
                    <li>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 hover:bg-[#252b36] hover:text-white"
                        role="menuitem"
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/favorites"
                        className="block px-4 py-2 hover:bg-[#252b36] hover:text-white"
                        role="menuitem"
                      >
                        Listenlist
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/stats"
                        className="block px-4 py-2 hover:bg-[#252b36] hover:text-white"
                        role="menuitem"
                      >
                        Spotify Stats
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/search"
                        className="block px-4 py-2 hover:bg-[#252b36] hover:text-white"
                        role="menuitem"
                      >
                        Discover
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/generate"
                        className="block px-4 py-2 hover:bg-[#252b36] hover:text-white"
                        role="menuitem"
                      >
                        AI Studio
                      </Link>
                    </li>
                    <li className="border-t border-white/[0.06] pt-1">
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-[#e8a4bc] hover:bg-[#252b36] hover:text-[#fb3d93]"
                        role="menuitem"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        Sign out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {isAuthed ? (
            <div className="group relative inline-flex shrink-0">
              <Link
                href="/activity"
                aria-label="Activity"
                className="group inline-flex h-9 w-9 items-center justify-center text-white transition-colors duration-200 hover:text-[#fb3d93] sm:h-10 sm:w-10"
              >
                <Music2
                  className="h-[1.125rem] w-[1.125rem] text-inherit transition-colors group-hover:text-[#fb3d93] sm:h-5 sm:w-5"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </Link>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-[var(--bg-2)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)] opacity-0 shadow-lg shadow-black/30 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Activity
              </span>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
