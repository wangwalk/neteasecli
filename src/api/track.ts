import * as os from 'os';
import * as path from 'path';
import { getApiClient } from './client.js';
import type { Track, Lyric, Quality, QualityBrMap } from '../types/index.js';

interface NeteaseTrackDetailResponse {
  code: number;
  songs: {
    id: number;
    name: string;
    ar?: { id: number; name: string }[];
    al?: { id: number; name: string; picUrl?: string };
    artists?: { id: number; name: string }[];
    album?: { id: number; name: string; picUrl?: string };
    dt?: number;
    duration?: number;
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
  const artists = track.ar || track.artists || [];
  const album = track.al || track.album || { id: 0, name: '' };
  return {
    id: String(track.id),
    name: track.name,
    artists: artists.map((a) => ({ id: String(a.id), name: a.name })),
    album: {
      id: String(album.id),
      name: album.name,
      picUrl: album.picUrl,
    },
    duration: track.dt || track.duration || 0,
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

export async function downloadTrack(
  id: string,
  quality: Quality = 'exhigh',
  outputPath?: string,
): Promise<{ path: string; size: number }> {
  const client = getApiClient();
  const url = await getTrackUrl(id, quality);

  const ext = url.includes('.flac') ? 'flac' : 'mp3';
  const dest = outputPath || path.join(os.tmpdir(), `neteasecli-${id}.${ext}`);

  await client.download(url, dest);

  const { size } = await import('fs').then((fs) => fs.statSync(dest));
  return { path: dest, size };
}

export async function getTrackDetails(ids: string[]): Promise<Track[]> {
  const client = getApiClient();

  const c = JSON.stringify(ids.map((id) => ({ id: Number(id) })));

  const response = await client.request<NeteaseTrackDetailResponse>('/song/detail', {
    c,
    ids: `[${ids.join(',')}]`,
  });

  return (response.songs || []).map((track) => {
    const artists = track.ar || track.artists || [];
    const album = track.al || track.album || { id: 0, name: '' };
    return {
      id: String(track.id),
      name: track.name,
      artists: artists.map((a) => ({ id: String(a.id), name: a.name })),
      album: {
        id: String(album.id),
        name: album.name,
        picUrl: album.picUrl,
      },
      duration: track.dt || track.duration || 0,
      uri: `netease:track:${track.id}`,
    };
  });
}
