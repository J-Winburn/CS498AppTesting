import type { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getSupabaseAdminOrNull } from "@/lib/supabase-admin";

const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
].join(" ");

async function refreshSpotifyAccessToken(token: any): Promise<any> {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify credentials");
    }

    const url = "https://accounts.spotify.com/api/token";
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok || refreshedTokens.error) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;

        if (!identifier || !password) {
          return null;
        }

        if (!isSupabaseConfigured()) {
          throw new Error(
            "Supabase is not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server.",
          );
        }

        let email = identifier;
        if (!identifier.includes("@")) {
          const admin = getSupabaseAdminOrNull();
          if (admin) {
            const { data: row } = await admin
              .from("user_profiles")
              .select("email")
              .eq("username", identifier.toLowerCase())
              .maybeSingle();
            if (row?.email) {
              email = row.email;
            } else {
              throw new Error("Invalid email/username or password.");
            }
          } else {
            throw new Error("Username login requires profile database configuration.");
          }
        }

        const { data, error } = await getSupabase().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const code = (error as { code?: string }).code;
          const msg = (error.message || "").toLowerCase();

          if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
            throw new Error(
              "Confirm your email before signing in (check your inbox). For local testing you can disable “Confirm email” under Supabase → Authentication → Providers → Email.",
            );
          }

          if (
            code === "invalid_credentials" ||
            msg.includes("invalid login") ||
            msg.includes("invalid credentials")
          ) {
            throw new Error("Invalid email/username or password.");
          }

          throw new Error(error.message || "Could not sign in.");
        }

        if (!data.user) {
          throw new Error("Could not sign in.");
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name:
            (data.user.user_metadata?.firstName as string | undefined) ||
            (data.user.user_metadata?.full_name as string | undefined) ||
            data.user.email,
        };
      },
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          image: profile.images?.[0]?.url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        const expiresIn = account.expires_in
        ? Number(account.expires_in)
        : undefined;

      return {
        ...token,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        accessTokenExpires:
          expiresIn !== undefined ? Date.now() + expiresIn * 1000 : undefined,
        user,
      };
      }

      // Email/password sessions have no Spotify refresh token — never hit Spotify's API
      if (!token.refreshToken) {
        return token;
      }

      if (!token.accessToken) {
        return token;
      }

      const accessTokenExpires = token.accessTokenExpires as number | undefined;

      if (accessTokenExpires && Date.now() < accessTokenExpires - 60_000) {
        return token;
      }

      return refreshSpotifyAccessToken(token);
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        error: token.error,
      };
    },
  },
};
