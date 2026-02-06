// 基础响应格式
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
}

// 艺术家
export interface Artist {
  id: string;
  name: string;
}

// 专辑
export interface Album {
  id: string;
  name: string;
  picUrl?: string;
}

// 歌曲
export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration: number; // 毫秒
  uri: string;
}

// 歌单
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

// 搜索类型
export type SearchType = 'track' | 'album' | 'playlist' | 'artist';

// 搜索类型映射到网易云 API type 参数
export const SearchTypeMap: Record<SearchType, number> = {
  track: 1,
  album: 10,
  playlist: 1000,
  artist: 100,
};

// 搜索结果
export interface SearchResult {
  tracks?: Track[];
  albums?: Album[];
  playlists?: Playlist[];
  artists?: Artist[];
  total: number;
  offset: number;
  limit: number;
}

// 歌词
export interface Lyric {
  lrc?: string; // 原文歌词
  tlyric?: string; // 翻译歌词
}

// 音质
export type Quality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires';

export const QualityBrMap: Record<Quality, number> = {
  standard: 128000,
  higher: 192000,
  exhigh: 320000,
  lossless: 999000,
  hires: 999000,
};

// 用户信息
export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

// Cookie 数据
export interface CookieData {
  MUSIC_U?: string;
  __csrf?: string;
  NMTID?: string;
  [key: string]: string | undefined;
}

// 退出码
export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  AUTH_ERROR: 2,
  NETWORK_ERROR: 3,
} as const;
