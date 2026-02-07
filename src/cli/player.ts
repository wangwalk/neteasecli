import { Command } from 'commander';
import { mpvPlayer } from '../player/mpv.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function requireRunning(): Promise<void> {
  if (!(await mpvPlayer.isRunning())) {
    outputError('PLAYER_ERROR', 'Nothing is playing');
    process.exit(ExitCode.GENERAL_ERROR);
  }
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
        const repeat = status.loop !== 'no' && status.loop !== 'false';
        output({
          playing: true,
          paused: status.paused,
          title: status.title,
          position: status.position,
          duration: status.duration,
          positionFormatted: formatTime(status.position),
          durationFormatted: formatTime(status.duration),
          volume: Math.round(status.volume),
          repeat,
          message: `${status.paused ? '⏸' : '▶'} ${status.title || 'Unknown'} ${formatTime(status.position)}/${formatTime(status.duration)} vol:${Math.round(status.volume)}%${repeat ? ' 🔁' : ''}`,
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
        await requireRunning();
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

  player
    .command('seek <seconds>')
    .description('Seek by relative seconds (e.g. 10, -10) or absolute with --absolute')
    .option('--absolute', 'Seek to absolute position')
    .action(async (seconds: string, opts: { absolute?: boolean }) => {
      try {
        await requireRunning();
        const secs = Number(seconds);
        if (isNaN(secs)) {
          outputError('PLAYER_ERROR', 'Invalid seconds value');
          process.exit(ExitCode.GENERAL_ERROR);
          return;
        }
        await mpvPlayer.seek(secs, opts.absolute ? 'absolute' : 'relative');
        const status = await mpvPlayer.getStatus();
        output({
          position: status.position,
          duration: status.duration,
          positionFormatted: formatTime(status.position),
          durationFormatted: formatTime(status.duration),
          message: `Seeked to ${formatTime(status.position)}/${formatTime(status.duration)}`,
        });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  player
    .command('volume [level]')
    .description('Get or set volume (0-150)')
    .action(async (level?: string) => {
      try {
        await requireRunning();
        if (level !== undefined) {
          const vol = Number(level);
          if (isNaN(vol)) {
            outputError('PLAYER_ERROR', 'Invalid volume value');
            process.exit(ExitCode.GENERAL_ERROR);
            return;
          }
          await mpvPlayer.setVolume(vol);
          output({ volume: vol, message: `Volume: ${vol}%` });
        } else {
          const vol = await mpvPlayer.getVolume();
          output({ volume: vol, message: `Volume: ${Math.round(vol)}%` });
        }
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  player
    .command('repeat [mode]')
    .description('Toggle or set repeat mode (off/on)')
    .action(async (mode?: string) => {
      try {
        await requireRunning();
        if (mode !== undefined) {
          await mpvPlayer.setLoop(mode === 'on' ? 'inf' : 'no');
          output({ repeat: mode === 'on', message: `Repeat: ${mode}` });
        } else {
          const current = await mpvPlayer.getLoop();
          const isOn = current !== 'no' && current !== 'false';
          await mpvPlayer.setLoop(isOn ? 'no' : 'inf');
          output({ repeat: !isOn, message: `Repeat: ${!isOn ? 'on' : 'off'}` });
        }
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  return player;
}
