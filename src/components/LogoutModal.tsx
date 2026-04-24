"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/`;
      const firstResult = await signOut({
        redirect: false,
        callbackUrl,
      });

      // Some linked-account sessions keep an additional auth cookie on first sign-out.
      // Run a second pass to make one click fully terminate the session.
      const secondResult = await signOut({
        redirect: false,
        callbackUrl,
      });

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      window.location.replace(secondResult?.url ?? firstResult?.url ?? callbackUrl);
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl max-w-sm">
        <h2 className="text-xl font-bold text-zinc-50 mb-2">Log out?</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Are you sure you want to log out of your account?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-white/20 px-4 py-2 font-medium text-zinc-200 hover:bg-zinc-900 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-[#fb3d93] px-4 py-2 font-medium text-white hover:bg-[#e63a85] transition disabled:opacity-50"
          >
            {isLoading ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
