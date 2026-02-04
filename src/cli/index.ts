import { Command } from 'commander';
import { createAuthCommand } from './auth.js';
import { createSearchCommand } from './search.js';
import {
  createPlayCommand,
  createPauseCommand,
  createResumeCommand,
  createNextCommand,
  createPrevCommand,
  createSeekCommand,
  createVolumeCommand,
  createModeCommand,
} from './play.js';
import { createStatusCommand, createQueueCommand } from './status.js';
import { createPlaylistCommand } from './playlist.js';
import { createLibraryCommand } from './library.js';
import { createTrackCommand } from './track.js';
import { setPrettyPrint, setQuietMode } from '../output/json.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('neteasecli')
    .description('网易云音乐 AI Agent CLI 工具')
    .version('1.0.0')
    .option('--json', 'JSON 输出（默认）')
    .option('--pretty', '格式化 JSON 输出')
    .option('--quiet', '静默模式')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.pretty) {
        setPrettyPrint(true);
      }
      if (opts.quiet) {
        setQuietMode(true);
      }
    });

  // 添加所有子命令
  program.addCommand(createAuthCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createPlayCommand());
  program.addCommand(createPauseCommand());
  program.addCommand(createResumeCommand());
  program.addCommand(createNextCommand());
  program.addCommand(createPrevCommand());
  program.addCommand(createSeekCommand());
  program.addCommand(createVolumeCommand());
  program.addCommand(createModeCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createQueueCommand());
  program.addCommand(createPlaylistCommand());
  program.addCommand(createLibraryCommand());
  program.addCommand(createTrackCommand());

  return program;
}
