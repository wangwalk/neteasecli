import { Command } from 'commander';
import { createAuthCommand } from './auth.js';
import { createSearchCommand } from './search.js';
import { createPlaylistCommand } from './playlist.js';
import { createLibraryCommand } from './library.js';
import { createTrackCommand } from './track.js';
import { createPlayerCommand } from './player.js';
import { setPrettyPrint, setQuietMode } from '../output/json.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('neteasecli')
    .description('Simple CLI for Netease Cloud Music')
    .version('2.0.0')
    .option('--json', 'JSON output (default)')
    .option('--pretty', 'Pretty-print JSON')
    .option('--quiet', 'Quiet mode')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.pretty) {
        setPrettyPrint(true);
      }
      if (opts.quiet) {
        setQuietMode(true);
      }
    });

  program.addCommand(createAuthCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createTrackCommand());
  program.addCommand(createLibraryCommand());
  program.addCommand(createPlaylistCommand());
  program.addCommand(createPlayerCommand());

  return program;
}
