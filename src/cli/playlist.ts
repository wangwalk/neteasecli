import { Command } from 'commander';
import {
  getUserPlaylists,
  getPlaylistDetail,
} from '../api/playlist.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createPlaylistCommand(): Command {
  const playlist = new Command('playlist').description('歌单管理（只读）');

  playlist
    .command('list')
    .description('我的歌单')
    .action(async () => {
      try {
        const playlists = await getUserPlaylists();
        output({
          playlists: playlists.map((p) => ({
            id: p.id,
            name: p.name,
            trackCount: p.trackCount,
            creator: p.creator?.name,
          })),
          total: playlists.length,
        });
      } catch (error) {
        outputError('PLAYLIST_ERROR', error instanceof Error ? error.message : '获取歌单失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  playlist
    .command('detail')
    .description('歌单详情')
    .argument('<id>', '歌单 ID')
    .option('-l, --limit <number>', '显示歌曲数量', '50')
    .action(async (id: string, options) => {
      try {
        const detail = await getPlaylistDetail(id);
        const limit = parseInt(options.limit);
        output({
          id: detail.id,
          name: detail.name,
          description: detail.description,
          coverUrl: detail.coverUrl,
          trackCount: detail.trackCount,
          creator: detail.creator,
          tracks: detail.tracks?.slice(0, limit).map((t) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            duration: t.duration,
            uri: t.uri,
          })),
        });
      } catch (error) {
        outputError('PLAYLIST_ERROR', error instanceof Error ? error.message : '获取歌单详情失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  return playlist;
}
