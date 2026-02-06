import { getApiClient } from './client.js';
import type { Track, UserProfile } from '../types/index.js';

interface NeteaseUserAccountResponse {
  code: number;
  profile: {
    userId: number;
    nickname: string;
    avatarUrl?: string;
  };
}

interface NeteaseLikelistResponse {
  code: number;
  ids: number[];
}

interface NeteaseRecentResponse {
  code: number;
  data: {
    list: {
      resourceId: string;
      playTime: number;
      data: {
        id: number;
        name: string;
        ar: { id: number; name: string }[];
        al: { id: number; name: string; picUrl?: string };
        dt: number;
      };
    }[];
  };
}

function transformTrack(track: {
  id: number;
  name: string;
  ar: { id: number; name: string }[];
  al: { id: number; name: string; picUrl?: string };
  dt: number;
}): Track {
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

export async function getUserProfile(): Promise<UserProfile> {
  const client = getApiClient();

  const response = await client.request<NeteaseUserAccountResponse>('/nuser/account/get');

  return {
    id: String(response.profile.userId),
    nickname: response.profile.nickname,
    avatarUrl: response.profile.avatarUrl,
  };
}

export async function getLikedTrackIds(): Promise<string[]> {
  const client = getApiClient();

  // 先获取用户 ID
  const userProfile = await getUserProfile();

  const response = await client.request<NeteaseLikelistResponse>('/likelist', {
    uid: userProfile.id,
  });

  return response.ids.map(String);
}

export async function likeTrack(id: string, like: boolean = true): Promise<void> {
  const client = getApiClient();

  await client.request('/like', {
    trackId: id,
    like,
  });
}

export async function getRecentTracks(limit: number = 100): Promise<Track[]> {
  const client = getApiClient();

  const response = await client.request<NeteaseRecentResponse>('/record/recent/song', {
    limit,
  });

  return response.data.list.map((item) => transformTrack(item.data));
}
