import { Command } from 'commander';
import { getTrackDetail, getTrackUrl, getLyric, downloadTrack } from '../api/track.js';
import { output, outputError } from '../output/json.js';
import { ExitCode, type Quality } from '../types/index.js';

export function createTrackCommand(): Command {
  const track = new Command('track').description('歌曲信息');

  track
    .command('detail')
    .description('歌曲详情')
    .argument('<id>', '歌曲 ID')
    .action(async (id: string) => {
      try {
        const detail = await getTrackDetail(id);
        output({
          id: detail.id,
          name: detail.name,
          artists: detail.artists,
          album: detail.album,
          duration: detail.duration,
          durationFormatted: formatDuration(detail.duration),
          uri: detail.uri,
        });
      } catch (error) {
        outputError('TRACK_ERROR', error instanceof Error ? error.message : '获取失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('url')
    .description('获取播放链接')
    .argument('<id>', '歌曲 ID')
    .option('-q, --quality <level>', '音质: standard/higher/exhigh/lossless/hires', 'exhigh')
    .action(async (id: string, options) => {
      try {
        const url = await getTrackUrl(id, options.quality as Quality);
        output({ id, url, quality: options.quality });
      } catch (error) {
        outputError('TRACK_ERROR', error instanceof Error ? error.message : '获取失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('lyric')
    .description('获取歌词')
    .argument('<id>', '歌曲 ID')
    .action(async (id: string) => {
      try {
        const lyric = await getLyric(id);
        output({
          id,
          lrc: lyric.lrc,
          tlyric: lyric.tlyric,
          hasLyric: !!lyric.lrc,
          hasTranslation: !!lyric.tlyric,
        });
      } catch (error) {
        outputError('TRACK_ERROR', error instanceof Error ? error.message : '获取失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('download')
    .description('下载歌曲到本地')
    .argument('<id>', '歌曲 ID')
    .option('-q, --quality <level>', '音质: standard/higher/exhigh/lossless/hires', 'exhigh')
    .option('-o, --output <path>', '输出文件路径')
    .action(async (id: string, options) => {
      try {
        const result = await downloadTrack(id, options.quality as Quality, options.output);
        output({
          id,
          path: result.path,
          size: result.size,
          quality: options.quality,
        });
      } catch (error) {
        outputError('TRACK_ERROR', error instanceof Error ? error.message : '下载失败');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  return track;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
