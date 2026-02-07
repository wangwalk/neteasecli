import { getApiClient } from './client.js';
import type { SearchType, SearchResult, Track, Album, Playlist, Artist } from '../types/index.js';

interface NeteaseSearchResponse {
  code: number;
  result: {
    songs?: NeteaseTrack[];
    albums?: NeteaseAlbum[];
    playlists?: NeteasePlaylist[];
    artists?: NeteaseArtist[];
    songCount?: number;
    albumCount?: number;
    playlistCount?: number;
    artistCount?: number;
  };
}

interface NeteaseTrack {
  id: number;
  name: string;
  ar: { id: number; name: string }[];
  al: { id: number; name: string; picUrl?: string };
  dt: number;
}

interface NeteaseAlbum {
  id: number;
  name: string;
  picUrl?: string;
}

interface NeteasePlaylist {
  id: number;
  name: string;
  description?: string;
  coverImgUrl?: string;
  trackCount: number;
  creator?: { userId: number; nickname: string };
}

interface NeteaseArtist {
  id: number;
  name: string;
}

const typeMap: Record<SearchType, number> = {
  track: 1,
  album: 10,
  playlist: 1000,
  artist: 100,
};

function transformTrack(track: NeteaseTrack): Track {
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

function transformAlbum(album: NeteaseAlbum): Album {
  return {
    id: String(album.id),
    name: album.name,
    picUrl: album.picUrl,
  };
}

function transformPlaylist(playlist: NeteasePlaylist): Playlist {
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
  };
}

function transformArtist(artist: NeteaseArtist): Artist {
  return {
    id: String(artist.id),
    name: artist.name,
  };
}

export async function search(
  keyword: string,
  type: SearchType = 'track',
  limit: number = 20,
  offset: number = 0,
): Promise<SearchResult> {
  const client = getApiClient();

  const response = await client.request<NeteaseSearchResponse>('/cloudsearch/get/web', {
    s: keyword,
    type: typeMap[type],
    limit,
    offset,
  });

  const result: SearchResult = {
    total: 0,
    offset,
    limit,
  };

  switch (type) {
    case 'track':
      result.tracks = (response.result.songs || []).map(transformTrack);
      result.total = response.result.songCount || 0;
      break;
    case 'album':
      result.albums = (response.result.albums || []).map(transformAlbum);
      result.total = response.result.albumCount || 0;
      break;
    case 'playlist':
      result.playlists = (response.result.playlists || []).map(transformPlaylist);
      result.total = response.result.playlistCount || 0;
      break;
    case 'artist':
      result.artists = (response.result.artists || []).map(transformArtist);
      result.total = response.result.artistCount || 0;
      break;
  }

  return result;
}
