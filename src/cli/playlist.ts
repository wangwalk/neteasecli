import { Command } from 'commander';
import {
  getUserPlaylists,
  getPlaylistDetail,
  createPlaylist,
  addTracksToPlaylist,
  removeTracksFromPlaylist,
  deletePlaylist,
} from '../api/playlist.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createPlaylistCommand(): Command {
  const playlist = new Command('playlist').description('歌单管理');

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

  playlist
    .command('create')
    .description('创建歌单')
    .argument('<name>', '歌单名称')
    .option('--private', '设为私密歌单')
    .action(async (name: string, options) => {
      try {
        const newPlaylist = await createPlaylist(name, options.private);
        output({
          message: '歌单创建成功',
          playlist: {
            id: newPlaylist.id,
            name: newPlaylist.name,
          },
        });
      } catch (error) {
        outputError('PLAYLIST_ERROR', error instanceof Error ? error.message : '创建歌单失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  playlist
    .command('add')
    .description('添加歌曲到歌单')
    .argument('<playlist_id>', '歌单 ID')
    .argument('<track_ids...>', '歌曲 ID（可多个）')
    .action(async (playlistId: string, trackIds: string[]) => {
      try {
        await addTracksToPlaylist(playlistId, trackIds);
        output({
          message: '添加成功',
          playlistId,
          trackIds,
        });
      } catch (error) {
        outputError('PLAYLIST_ERROR', error instanceof Error ? error.message : '添加失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  playlist
    .command('remove')
    .description('从歌单移除歌曲')
    .argument('<playlist_id>', '歌单 ID')
    .argument('<track_ids...>', '歌曲 ID（可多个）')
    .action(async (playlistId: string, trackIds: string[]) => {
      try {
        await removeTracksFromPlaylist(playlistId, trackIds);
        output({
          message: '移除成功',
          playlistId,
          trackIds,
        });
      } catch (error) {
        outputError('PLAYLIST_ERROR', error instanceof Error ? error.message : '移除失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  playlist
    .command('delete')
    .description('删除歌单')
    .argument('<id>', '歌单 ID')
    .action(async (id: string) => {
      try {
        await deletePlaylist(id);
        output({ message: '歌单已删除', id });
      } catch (error) {
        outputError('PLAYLIST_ERROR', error instanceof Error ? error.message : '删除失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  return playlist;
}
