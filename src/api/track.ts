import { getApiClient } from './client.js';
import type { Track, Lyric, Quality, QualityBrMap } from '../types/index.js';

interface NeteaseTrackDetailResponse {
  code: number;
  songs: {
    id: number;
    name: string;
    ar: { id: number; name: string }[];
    al: { id: number; name: string; picUrl?: string };
    dt: number;
  }[];
}

interface NeteaseUrlResponse {
  code: number;
  data: {
    id: number;
    url: string | null;
    br: number;
    size: number;
    type: string;
  }[];
}

interface NeteaseLyricResponse {
  code: number;
  lrc?: { lyric: string };
  tlyric?: { lyric: string };
}

// 音质映射
const qualityBrMap: Record<Quality, number> = {
  standard: 128000,
  higher: 192000,
  exhigh: 320000,
  lossless: 999000,
  hires: 999000,
};

export async function getTrackDetail(id: string): Promise<Track> {
  const client = getApiClient();

  const response = await client.request<NeteaseTrackDetailResponse>('/song/detail', {
    c: JSON.stringify([{ id: Number(id) }]),
    ids: `[${id}]`,
  });

  if (!response.songs || response.songs.length === 0) {
    throw new Error(`歌曲不存在: ${id}`);
  }

  const track = response.songs[0];
  return {
    id: String(track.id),
    name: track.name,
    artists: track.ar.map((a) => ({ id: String(a.id), name: a.name })),
    album: {
      id: String(track.al.id),
      name: track.al.name,
      picUrl: track.al.picUrl,
    },
    duration: track.dt,
    uri: `netease:track:${track.id}`,
  };
}

export async function getTrackUrl(id: string, quality: Quality = 'exhigh'): Promise<string> {
  const client = getApiClient();

  const br = qualityBrMap[quality];

  const response = await client.request<NeteaseUrlResponse>('/song/enhance/player/url', {
    ids: `[${id}]`,
    br,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error(`无法获取歌曲链接: ${id}`);
  }

  const url = response.data[0].url;
  if (!url) {
    throw new Error('歌曲暂无版权或需要 VIP');
  }

  return url;
}

export async function getLyric(id: string): Promise<Lyric> {
  const client = getApiClient();

  const response = await client.request<NeteaseLyricResponse>('/song/lyric', {
    id,
    lv: -1,
    tv: -1,
  });

  return {
    lrc: response.lrc?.lyric,
    tlyric: response.tlyric?.lyric,
  };
}

export async function getTrackDetails(ids: string[]): Promise<Track[]> {
  const client = getApiClient();

  const c = JSON.stringify(ids.map((id) => ({ id: Number(id) })));

  const response = await client.request<NeteaseTrackDetailResponse>('/song/detail', {
    c,
    ids: `[${ids.join(',')}]`,
  });

  return (response.songs || []).map((track) => ({
    id: String(track.id),
    name: track.name,
    artists: track.ar.map((a) => ({ id: String(a.id), name: a.name })),
    album: {
      id: String(track.al.id),
      name: track.al.name,
      picUrl: track.al.picUrl,
    },
    duration: track.dt,
    uri: `netease:track:${track.id}`,
  }));
}
