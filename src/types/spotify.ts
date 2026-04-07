export type SpotifyUser = {
  id: string;
  display_name: string | null;
  images?: { url: string }[];
};

export type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: { name: string; images?: { url: string }[] };
  external_urls?: { spotify?: string };
};

export type Artist = {
  id: string;
  name: string;
  genres?: string[];
  images?: { url: string }[];
  followers?: { total: number };
  external_urls?: { spotify?: string };
};

export type SearchResponse = {
  tracks: Track[];
  artists: Artist[];
  error?: string;
};
