import { Command } from 'commander';
import { createAuthCommand } from './auth.js';
import { createSearchCommand } from './search.js';
import { createPlaylistCommand } from './playlist.js';
import { createLibraryCommand } from './library.js';
import { createTrackCommand } from './track.js';
import { setPrettyPrint, setQuietMode } from '../output/json.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('neteasecli')
    .description('Simple CLI for Netease Cloud Music')
    .version('2.0.0')
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

  // Core commands (read-only data retrieval)
  program.addCommand(createAuthCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createTrackCommand());
  program.addCommand(createLibraryCommand());
  program.addCommand(createPlaylistCommand());

  return program;
}
