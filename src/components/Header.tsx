"use client";

import { useSession, signIn, signOut, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const { data: session, status, update } = useSession();
  const user = session?.user;
  const [hasChecked, setHasChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for session on mount and when unauthenticated
    if (!hasChecked || status === "unauthenticated") {
      // Add a small delay to ensure callback has completed
      setTimeout(() => {
        getSession().then((serverSession) => {
          if (serverSession && !session) {
            update();
            // Force a page refresh to ensure session is picked up
            router.refresh();
          }
          setHasChecked(true);
        });
      }, 100);
    }
  }, [status, session, update, hasChecked]);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <h1 className="text-xl font-bold text-green-500">Spotify Search</h1>
      <div className="flex items-center gap-4">
        {status === "loading" ? (
          <span className="text-foreground">Loading...</span>
        ) : user ? (
          <div className="flex items-center gap-4">
            <span className="text-foreground">{user.name || user.email || "Spotify user"}</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 bg-green-500 text-black rounded font-medium hover:bg-green-600 transition"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => signIn("spotify", { callbackUrl: "/" })}
            className="px-4 py-2 bg-green-500 text-black rounded font-medium hover:bg-green-600 transition"
          >
            Log in with Spotify
          </button>
        )}
      </div>
    </header>
  );
}
