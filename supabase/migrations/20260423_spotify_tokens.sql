-- Add Spotify linked-account token columns to user_profiles.
-- These are populated by the PKCE link flow (/api/spotify/link/callback)
-- and read by spotify-user-token.ts to make authenticated Spotify API calls
-- on behalf of credentials (email/password) users.

alter table public.user_profiles
  add column if not exists spotify_id text,
  add column if not exists spotify_access_token text,
  add column if not exists spotify_refresh_token text,
  add column if not exists spotify_token_expires_at timestamptz,
  add column if not exists spotify_scope text;

create unique index if not exists idx_user_profiles_spotify_id
  on public.user_profiles(spotify_id)
  where spotify_id is not null;
