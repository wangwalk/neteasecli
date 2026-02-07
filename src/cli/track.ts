import { Command } from 'commander';
import { getTrackDetail, getTrackUrl, getLyric, downloadTrack } from '../api/track.js';
import { mpvPlayer } from '../player/mpv.js';
import { output, outputError } from '../output/json.js';
import { ExitCode, type Quality } from '../types/index.js';

export function createTrackCommand(): Command {
  const track = new Command('track').description('Track info');

  track
    .command('detail')
    .description('Track details')
    .argument('<id>', 'Track ID')
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
        outputError('TRACK_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('url')
    .description('Get streaming URL')
    .argument('<id>', 'Track ID')
    .option('-q, --quality <level>', 'Quality: standard/higher/exhigh/lossless/hires', 'exhigh')
    .action(async (id: string, options) => {
      try {
        const url = await getTrackUrl(id, options.quality as Quality);
        output({ id, url, quality: options.quality });
      } catch (error) {
        outputError('TRACK_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('lyric')
    .description('Get lyrics')
    .argument('<id>', 'Track ID')
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
        outputError('TRACK_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('download')
    .description('Download track')
    .argument('<id>', 'Track ID')
    .option('-q, --quality <level>', 'Quality: standard/higher/exhigh/lossless/hires', 'exhigh')
    .option('-o, --output <path>', 'Output file path')
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
        outputError('TRACK_ERROR', error instanceof Error ? error.message : 'Download failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  track
    .command('play')
    .description('Play track via mpv')
    .argument('<id>', 'Track ID')
    .option('-q, --quality <level>', 'Quality: standard/higher/exhigh/lossless/hires', 'exhigh')
    .action(async (id: string, options) => {
      try {
        const [url, detail] = await Promise.all([
          getTrackUrl(id, options.quality as Quality),
          getTrackDetail(id),
        ]);

        const title = `${detail.name} - ${detail.artists.map((a) => a.name).join('/')}`;
        await mpvPlayer.play(url, title);

        output({
          id,
          name: detail.name,
          artists: detail.artists,
          quality: options.quality,
          message: `Now playing: ${title}`,
        });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Playback failed');
        process.exit(ExitCode.GENERAL_ERROR);
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
