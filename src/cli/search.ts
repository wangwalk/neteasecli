import { Command } from 'commander';
import { search } from '../api/search.js';
import { output, outputError } from '../output/json.js';
import { ExitCode, type SearchType } from '../types/index.js';

export function createSearchCommand(): Command {
  const searchCmd = new Command('search').description('Search music');

  const createSubCommand = (type: SearchType, description: string) => {
    return new Command(type)
      .description(description)
      .argument('<keyword>', 'Search keyword')
      .option('-l, --limit <number>', 'Result count', '20')
      .option('-o, --offset <number>', 'Offset', '0')
      .action(async (keyword: string, options) => {
        try {
          const result = await search(
            keyword,
            type,
            parseInt(options.limit),
            parseInt(options.offset),
          );
          output(result);
        } catch (error) {
          outputError('SEARCH_ERROR', error instanceof Error ? error.message : 'Search failed');
          process.exit(ExitCode.NETWORK_ERROR);
        }
      });
  };

  searchCmd.addCommand(createSubCommand('track', 'Search tracks'));
  searchCmd.addCommand(createSubCommand('album', 'Search albums'));
  searchCmd.addCommand(createSubCommand('playlist', 'Search playlists'));
  searchCmd.addCommand(createSubCommand('artist', 'Search artists'));

  return searchCmd;
}
