import { Command } from 'commander';
import { createAuthCommand } from './auth.js';
import { createSearchCommand } from './search.js';
import { createPlaylistCommand } from './playlist.js';
import { createLibraryCommand } from './library.js';
import { createTrackCommand } from './track.js';
import { createPlayerCommand } from './player.js';
import { setOutputMode, setPrettyPrint, setQuietMode } from '../output/json.js';
import { setNoColor } from '../output/color.js';
import { setVerbose, setDebug } from '../output/logger.js';
import { setProfile } from '../auth/storage.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('neteasecli')
    .description('Netease Cloud Music CLI')
    .version('2.0.0')
    .option('--json', 'JSON output (default when piped)')
    .option('--plain', 'Plain text output')
    .option('--pretty', 'Pretty-print JSON')
    .option('--quiet', 'Suppress output')
    .option('--no-color', 'Disable colors')
    .option('--profile <name>', 'Account profile', 'default')
    .option('-v, --verbose', 'Verbose output')
    .option('-d, --debug', 'Debug output (implies --verbose)')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.profile && opts.profile !== 'default') {
        setProfile(opts.profile);
      }
      if (opts.json) setOutputMode('json');
      if (opts.plain) setOutputMode('plain');
      if (opts.pretty) setPrettyPrint(true);
      if (opts.quiet) setQuietMode(true);
      if (!opts.color) setNoColor(true);
      if (opts.verbose) setVerbose(true);
      if (opts.debug) setDebug(true);
    });

  program.addCommand(createAuthCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createTrackCommand());
  program.addCommand(createLibraryCommand());
  program.addCommand(createPlaylistCommand());
  program.addCommand(createPlayerCommand());

  return program;
}
