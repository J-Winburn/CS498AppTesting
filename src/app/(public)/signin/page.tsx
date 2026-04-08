"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/search");
      }
    } catch (err) {
      setError("Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
              <span className="text-2xl">→</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 text-center">Sign in with email</h1>
          <p className="text-zinc-400 mb-8 text-center">
            Access your TuneHeadz account and discover music
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-200">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a href="#" className="text-sm text-[#fb3d93] hover:underline">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Get Started"}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500">Or sign in with</span>
              </div>
            </div>

            {/* Social Auth Buttons */}
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setError("Sign in with email first, then link Spotify from your profile.")}
                className="py-3 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 transition flex items-center justify-center gap-2 font-medium"
              >
                <span className="text-xl">🎵</span>
                Link Spotify from Profile
              </button>
            </div>

            <p className="text-center text-sm text-zinc-400">
              Don't have an account?{" "}
              <Link href="/signup" className="text-[#fb3d93] hover:underline font-medium">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
