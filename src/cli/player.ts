import { Command } from 'commander';
import { mpvPlayer } from '../player/mpv.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function createPlayerCommand(): Command {
  const player = new Command('player').description('Playback control');

  player
    .command('status')
    .description('Current playback status')
    .action(async () => {
      try {
        const status = await mpvPlayer.getStatus();
        if (!status.playing) {
          output({ playing: false, message: 'Nothing is playing' });
          return;
        }
        output({
          playing: true,
          paused: status.paused,
          title: status.title,
          position: status.position,
          duration: status.duration,
          positionFormatted: formatTime(status.position),
          durationFormatted: formatTime(status.duration),
          message: `${status.paused ? '⏸' : '▶'} ${status.title || 'Unknown'} ${formatTime(status.position)}/${formatTime(status.duration)}`,
        });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  player
    .command('pause')
    .description('Toggle pause/resume')
    .action(async () => {
      try {
        if (!mpvPlayer.isRunning()) {
          outputError('PLAYER_ERROR', 'Nothing is playing');
          process.exit(ExitCode.GENERAL_ERROR);
          return;
        }
        await mpvPlayer.pause();
        const status = await mpvPlayer.getStatus();
        output({
          paused: status.paused,
          message: status.paused ? 'Paused' : 'Resumed',
        });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  player
    .command('stop')
    .description('Stop playback')
    .action(async () => {
      try {
        await mpvPlayer.stop();
        output({ message: 'Stopped' });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  return player;
}
