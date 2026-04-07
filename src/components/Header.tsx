import { cookies } from "next/headers";
import { getValidUserToken, getSpotifyUser } from "@/lib/spotify-auth";

export default async function Header() {
  const cookieStore = await cookies();
  const token = await getValidUserToken(cookieStore);
  let user = null;

  if (token) {
    try {
      user = await getSpotifyUser(token);
    } catch {
      // If fetching user fails, we'll just show login button
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <h1 className="text-xl font-bold text-green-500">Spotify Search</h1>
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-foreground">{user.display_name || user.id}</span>
            <a
              href="/api/auth/logout"
              className="px-4 py-2 bg-green-500 text-black rounded font-medium hover:bg-green-600 transition"
            >
              Log out
            </a>
          </div>
        ) : (
          <a
            href="/api/auth/login"
            className="px-4 py-2 bg-green-500 text-black rounded font-medium hover:bg-green-600 transition"
          >
            Log in with Spotify
          </a>
        )}
      </div>
    </header>
  );
}
