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
    identifier: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = formData.identifier.trim().length > 0 && formData.password.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.identifier || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier: formData.identifier.trim(),
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth uses "CredentialsSignin" when authorize() returns null; we throw specific messages for other cases
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email/username or password."
            : result.error,
        );
      } else if (result?.ok) {
        router.push("/");
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch {
      setError("Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(251,61,147,0.14),transparent_32%),#07090f] py-12">
      <div className="th-shell">
        <div className="th-surface mx-auto w-full max-w-md p-8">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-[#8ea5b4]">Welcome back</p>
          <h1 className="mb-2 mt-3 text-center text-5xl leading-none">Sign In</h1>
          <p className="mb-8 text-center text-sm text-[#9ab0be]">Continue your music diary</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email or Username */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="th-form-label">
                Email or Username
              </Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="you@example.com or yourusername"
                value={formData.identifier}
                onChange={handleChange}
                className="th-input"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="th-form-label">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="th-input"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a href="#" className="text-sm text-[#fb3d93] hover:underline">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className={`w-full ${
                canSubmit
                  ? "th-btn"
                  : "th-btn-secondary text-[#d3d9e3]"
              }`}
              disabled={loading || !canSubmit}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-zinc-400">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-[#fb3d93] hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
