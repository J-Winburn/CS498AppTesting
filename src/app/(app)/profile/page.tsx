"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface PinnedItem {
  id: string;
  type: "track" | "album";
  name: string;
  artist: string;
  imageUrl: string | null;
  spotifyUrl?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Pinned items state
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [pinSearch, setPinSearch] = useState("");
  const [pinResults, setPinResults] = useState<PinnedItem[]>([]);
  const [isPinSearching, setIsPinSearching] = useState(false);
  const [showPinSearch, setShowPinSearch] = useState(false);
  const pinSearchRef = useRef<HTMLDivElement>(null);

  // Profile image state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pin search type
  const [pinSearchType, setPinSearchType] = useState<"track" | "album">("track");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    musicGenres: [] as string[],
    displayName: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            bio: data.bio || "",
            musicGenres: data.musicGenres || [],
            displayName: data.displayName || "",
          });
          if (Array.isArray(data.pinnedItems)) {
            setPinnedItems(data.pinnedItems);
          }
        } else {
          setLoadError(true);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setLoadError(true);
      }
    };

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  // Close pin search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pinSearchRef.current && !pinSearchRef.current.contains(e.target as Node)) {
        setShowPinSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const searchForPin = async () => {
    if (!pinSearch.trim()) return;
    setIsPinSearching(true);
    try {
      let results: PinnedItem[] = [];
      if (pinSearchType === "track") {
        const res = await fetch(`/api/search?q=${encodeURIComponent(pinSearch)}&type=track`);
        const data = await res.json();
        results = (data.tracks || []).slice(0, 6).map((t: any) => ({
          id: t.id,
          type: "track" as const,
          name: t.name,
          artist: t.artists?.map((a: any) => a.name).join(", ") || "",
          imageUrl: t.album?.images?.[0]?.url || null,
          spotifyUrl: t.external_urls?.spotify,
        }));
      } else {
        const res = await fetch(`/api/albums/search?q=${encodeURIComponent(pinSearch)}`);
        const data = await res.json();
        results = (data.albums || []).slice(0, 6).map((a: any) => ({
          id: a.id,
          type: "album" as const,
          name: a.name,
          artist: a.artist || "",
          imageUrl: a.image || null,
          spotifyUrl: undefined,
        }));
      }
      setPinResults(results);
      setShowPinSearch(true);
    } catch {
      // ignore
    } finally {
      setIsPinSearching(false);
    }
  };

  const addPin = async (item: PinnedItem) => {
    if (pinnedItems.find((p) => p.id === item.id)) return;
    const updated = [...pinnedItems, item];
    setPinnedItems(updated);
    setShowPinSearch(false);
    setPinSearch("");
    setPinResults([]);
    await savePinnedItems(updated);
  };

  const removePin = async (id: string) => {
    const updated = pinnedItems.filter((p) => p.id !== id);
    setPinnedItems(updated);
    await savePinnedItems(updated);
  };

  const savePinnedItems = async (items: PinnedItem[]) => {
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedItems: items }),
      });
    } catch {
      // ignore
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: dataUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
      }
    } catch {
      // ignore
    } finally {
      setIsUploadingImage(false);
      // reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setIsEditing(false);
        setMessage({ type: "success", text: "Profile updated successfully!" });
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while saving your profile" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectSpotify = () => {
    const currentUrl = new URL(window.location.href);
    // Keep OAuth start host aligned with callback host so link cookies are available.
    if (process.env.NODE_ENV === "development" && currentUrl.hostname === "localhost") {
      currentUrl.hostname = "127.0.0.1";
      currentUrl.pathname = "/api/spotify/link/start";
      currentUrl.search = "";
      currentUrl.hash = "";
      window.location.href = currentUrl.toString();
      return;
    }

    window.location.href = "/api/spotify/link/start";
  };

  const handleDisconnectSpotify = async () => {
    try {
      const response = await fetch("/api/spotify/link", { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        setMessage({ type: "error", text: payload.error || "Failed to disconnect Spotify." });
        return;
      }

      setUser((prev: any) => ({
        ...prev,
        spotifyId: null,
      }));
      setMessage({ type: "success", text: "Spotify account disconnected." });
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect Spotify." });
    }
  };

  useEffect(() => {
    const linked = searchParams.get("spotify_linked");
    const spotifyError = searchParams.get("spotify_error");

    if (linked === "1") {
      setMessage({ type: "success", text: "Spotify account linked successfully." });
      router.replace("/profile");
      return;
    }

    if (spotifyError) {
      const normalized = decodeURIComponent(spotifyError);
      if (normalized === "session_expired") {
        setMessage({
          type: "error",
          text: "Spotify link session expired. Open the app on http://127.0.0.1:3000 and try again.",
        });
        router.replace("/profile");
        return;
      }

      const readable = normalized.replace(/_/g, " ");
      setMessage({ type: "error", text: `Spotify link failed: ${readable}` });
      router.replace("/profile");
    }
  }, [searchParams, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          {loadError ? (
            <p className="text-red-400 mb-4">Failed to load profile. Please try signing out and back in.</p>
          ) : (
            <p className="text-zinc-400 mb-4">Loading profile...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-600 to-pink-500 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="relative group">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.displayName}
                    className="w-20 h-20 rounded-full border-4 border-white object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-zinc-700 border-4 border-white flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-medium disabled:cursor-wait"
                  title="Change profile picture"
                >
                  {isUploadingImage ? "Saving..." : "Change"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">{user.displayName || `${user.firstName || "User"}`}</h1>
                <p className="text-pink-100">{user.email}</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="ml-auto px-4 py-2 rounded-lg font-medium text-pink-600 bg-white text-sm hover:bg-pink-50 transition"
                >
                  Edit Profile
                </button>
              )}
            </div>


          </div>

          {/* Content */}
          <div className="p-6">
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-500/20 text-green-200 border border-green-500/50"
                    : "bg-red-500/20 text-red-200 border border-red-500/50"
                }`}
              >
                {message.text}
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">First Name</label>
                      <p className="text-zinc-100">{user.firstName || "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Last Name</label>
                      <p className="text-zinc-100">{user.lastName || "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Email</label>
                      <p className="text-zinc-100">{user.email || "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                      <p className="text-zinc-100">{user.phone || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                      <p className="text-zinc-100">{user.bio || "—"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Favorite Genres</h2>
                  <div>
                    {user.musicGenres?.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {user.musicGenres.map((g: string) => (
                          <span key={g} className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full text-xs">{g}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">No genres selected</p>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-3">Spotify Account</h2>
                  {user.spotifyId ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                      <p className="text-sm text-zinc-200">Connected as Spotify user ID: {user.spotifyId}</p>
                      <button
                        onClick={handleDisconnectSpotify}
                        className="rounded-md border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                      <p className="text-sm text-zinc-300">No Spotify account linked yet.</p>
                      <button
                        onClick={handleConnectSpotify}
                        className="rounded-md px-3 py-1.5 text-xs font-semibold text-black transition"
                        style={{ backgroundColor: "#1DB954" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1aa34a")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1DB954")}
                      >
                        Connect Spotify
                      </button>
                    </div>
                  )}
                </div>

                {/* Pinned Songs & Albums */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Pinned Songs &amp; Albums</h2>
                  </div>

                  {/* Pin search */}
                  <div ref={pinSearchRef} className="relative mb-4">
                    {/* Type toggle */}
                    <div className="flex gap-1 mb-2">
                      <button
                        onClick={() => { setPinSearchType("track"); setPinResults([]); setShowPinSearch(false); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          pinSearchType === "track"
                            ? "bg-pink-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        Songs
                      </button>
                      <button
                        onClick={() => { setPinSearchType("album"); setPinResults([]); setShowPinSearch(false); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          pinSearchType === "album"
                            ? "bg-pink-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        Albums
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pinSearch}
                        onChange={(e) => setPinSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") searchForPin(); }}
                        placeholder={pinSearchType === "track" ? "Search a song to pin..." : "Search an album to pin..."}
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      />
                      <button
                        onClick={searchForPin}
                        disabled={isPinSearching || !pinSearch.trim()}
                        className="px-4 py-2 rounded-lg font-medium text-black text-sm transition disabled:opacity-50"
                        style={{ backgroundColor: "#fb3d93" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e63a85")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fb3d93")}
                      >
                        {isPinSearching ? "..." : "Search"}
                      </button>
                    </div>

                    {showPinSearch && pinResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-y-auto max-h-72">
                        {pinResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => addPin(result)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition text-left"
                          >
                            {result.imageUrl ? (
                              <img src={result.imageUrl} alt={result.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                <span>🎵</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-100 truncate">{result.name}</p>
                              <p className="text-xs text-zinc-400 truncate">{result.artist}</p>
                            </div>
                            {pinnedItems.find((p) => p.id === result.id) && (
                              <span className="ml-auto text-xs text-pink-400 flex-shrink-0">Pinned</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {pinnedItems.length === 0 && (
                    <p className="text-zinc-500 text-sm mt-3">No pinned items yet. Search above to pin your Favorites.</p>
                  )}

                  {pinnedItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-64 overflow-y-auto pr-1">
                      {pinnedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3 border border-zinc-700 group"
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">🎵</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {item.spotifyUrl ? (
                              <a
                                href={item.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-zinc-100 hover:text-pink-400 transition truncate block"
                              >
                                {item.name}
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
                            )}
                            <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
                            <span className="text-xs text-pink-500 capitalize">{item.type}</span>
                          </div>
                          <button
                            onClick={() => removePin(item.id)}
                            className="text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                            title="Unpin"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-zinc-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-zinc-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-zinc-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="bio" className="block text-sm font-medium text-zinc-300 mb-1">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Favorite Genres
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Pop", "Hip-Hop", "R&B", "Rock", "Alternative", "Electronic", "Dance", "Jazz", "Classical", "Country", "Latin", "Metal", "Indie", "Soul", "Reggae"].map((genre) => {
                        const selected = formData.musicGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                musicGenres: selected
                                  ? prev.musicGenres.filter((g) => g !== genre)
                                  : [...prev.musicGenres, genre],
                              }))
                            }
                            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                              selected
                                ? "bg-pink-500 text-white"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg font-medium text-black transition disabled:opacity-50"
                    style={{ backgroundColor: "#fb3d93" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e63a85")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fb3d93")}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
