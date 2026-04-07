import type { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-library-read",
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
    signIn: "/auth/signin",
  },
  providers: [
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

      const accessTokenExpires = token.accessTokenExpires as number | undefined;

      if (accessTokenExpires && Date.now() < accessTokenExpires - 60_000) {
        return token;
      }

      return refreshSpotifyAccessToken(token);
    },
    async session({ session, token }) {
      return {
        ...session,
        user: token.user as typeof session.user,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        error: token.error,
      };
    },
  },
};
