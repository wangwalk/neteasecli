import { getApiClient } from './client.js';
import type { Playlist, Track } from '../types/index.js';

interface NeteasePlaylistResponse {
  code: number;
  playlist: {
    id: number;
    name: string;
    description?: string;
    coverImgUrl?: string;
    trackCount: number;
    creator?: { userId: number; nickname: string };
    tracks?: {
      id: number;
      name: string;
      ar?: { id: number; name: string }[];
      al?: { id: number; name: string; picUrl?: string };
      artists?: { id: number; name: string }[];
      album?: { id: number; name: string; picUrl?: string };
      dt?: number;
      duration?: number;
    }[];
  };
}

interface NeteaseUserPlaylistsResponse {
  code: number;
  playlist: {
    id: number;
    name: string;
    description?: string;
    coverImgUrl?: string;
    trackCount: number;
    creator?: { userId: number; nickname: string };
  }[];
}

interface NeteaseCreatePlaylistResponse {
  code: number;
  playlist: {
    id: number;
    name: string;
  };
}

function transformTrack(track: {
  id: number;
  name: string;
  ar?: { id: number; name: string }[];
  al?: { id: number; name: string; picUrl?: string };
  artists?: { id: number; name: string }[];
  album?: { id: number; name: string; picUrl?: string };
  dt?: number;
  duration?: number;
}): Track {
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

export async function getPlaylistDetail(id: string): Promise<Playlist> {
  const client = getApiClient();

  const response = await client.request<NeteasePlaylistResponse>('/v6/playlist/detail', {
    id,
    n: 100000,
  });

  const playlist = response.playlist;
  return {
    id: String(playlist.id),
    name: playlist.name,
    description: playlist.description,
    coverUrl: playlist.coverImgUrl,
    trackCount: playlist.trackCount,
    creator: playlist.creator
      ? {
          id: String(playlist.creator.userId),
          name: playlist.creator.nickname,
        }
      : undefined,
    tracks: playlist.tracks?.map(transformTrack),
  };
}

export async function getUserPlaylists(uid?: string): Promise<Playlist[]> {
  const client = getApiClient();

  // 如果没有提供 uid，需要先获取当前用户 id
  let userId = uid;
  if (!userId) {
    const userInfo = await client.request<{ code: number; profile: { userId: number } }>(
      '/nuser/account/get'
    );
    userId = String(userInfo.profile.userId);
  }

  const response = await client.request<NeteaseUserPlaylistsResponse>('/user/playlist', {
    uid: userId,
    limit: 1000,
    offset: 0,
  });

  return response.playlist.map((p) => ({
    id: String(p.id),
    name: p.name,
    description: p.description,
    coverUrl: p.coverImgUrl,
    trackCount: p.trackCount,
    creator: p.creator
      ? {
          id: String(p.creator.userId),
          name: p.creator.nickname,
        }
      : undefined,
  }));
}

export async function createPlaylist(name: string, privacy: boolean = false): Promise<Playlist> {
  const client = getApiClient();

  const response = await client.request<NeteaseCreatePlaylistResponse>('/playlist/create', {
    name,
    privacy: privacy ? 10 : 0,
  });

  return {
    id: String(response.playlist.id),
    name: response.playlist.name,
    trackCount: 0,
  };
}

export async function addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
  const client = getApiClient();

  await client.request('/playlist/manipulate/tracks', {
    op: 'add',
    pid: playlistId,
    trackIds: `[${trackIds.join(',')}]`,
  });
}

export async function removeTracksFromPlaylist(
  playlistId: string,
  trackIds: string[]
): Promise<void> {
  const client = getApiClient();

  await client.request('/playlist/manipulate/tracks', {
    op: 'del',
    pid: playlistId,
    trackIds: `[${trackIds.join(',')}]`,
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  const client = getApiClient();

  await client.request('/playlist/delete', {
    id,
  });
}
