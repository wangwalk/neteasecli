import { Command } from 'commander';
import { getLikedTrackIds, likeTrack, getRecentTracks } from '../api/user.js';
import { getTrackDetails } from '../api/track.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createLibraryCommand(): Command {
  const library = new Command('library').description('用户音乐库');

  library
    .command('liked')
    .description('我喜欢的音乐')
    .option('-l, --limit <number>', '显示数量', '50')
    .action(async (options) => {
      try {
        const ids = await getLikedTrackIds();
        const limit = parseInt(options.limit);
        const limitedIds = ids.slice(0, limit);

        if (limitedIds.length === 0) {
          output({ tracks: [], total: 0 });
          return;
        }

        const tracks = await getTrackDetails(limitedIds);
        output({
          tracks: tracks.map((t) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            uri: t.uri,
          })),
          total: ids.length,
          showing: limitedIds.length,
        });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : '获取失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  library
    .command('like')
    .description('收藏歌曲')
    .argument('<track_id>', '歌曲 ID')
    .action(async (trackId: string) => {
      try {
        await likeTrack(trackId, true);
        output({ message: '已收藏', trackId });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : '收藏失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  library
    .command('unlike')
    .description('取消收藏')
    .argument('<track_id>', '歌曲 ID')
    .action(async (trackId: string) => {
      try {
        await likeTrack(trackId, false);
        output({ message: '已取消收藏', trackId });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : '取消收藏失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  library
    .command('recent')
    .description('最近播放')
    .option('-l, --limit <number>', '显示数量', '50')
    .action(async (options) => {
      try {
        const limit = parseInt(options.limit);
        const tracks = await getRecentTracks(limit);
        output({
          tracks: tracks.map((t) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            uri: t.uri,
          })),
          total: tracks.length,
        });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : '获取失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  return library;
}
