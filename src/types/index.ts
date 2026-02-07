export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface Artist {
  id: string;
  name: string;
}

export interface Album {
  id: string;
  name: string;
  picUrl?: string;
}

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration: number;
  uri: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  trackCount: number;
  creator?: {
    id: string;
    name: string;
  };
  tracks?: Track[];
}

export type SearchType = 'track' | 'album' | 'playlist' | 'artist';

export interface SearchResult {
  tracks?: Track[];
  albums?: Album[];
  playlists?: Playlist[];
  artists?: Artist[];
  total: number;
  offset: number;
  limit: number;
}

export interface Lyric {
  lrc?: string;
  tlyric?: string;
}

export type Quality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires';

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

export interface CookieData {
  MUSIC_U?: string;
  __csrf?: string;
  NMTID?: string;
  [key: string]: string | undefined;
}

export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  AUTH_ERROR: 2,
  NETWORK_ERROR: 3,
} as const;
