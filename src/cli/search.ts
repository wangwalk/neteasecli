import { Command } from 'commander';
import { search } from '../api/search.js';
import { output, outputError } from '../output/json.js';
import { ExitCode, type SearchType } from '../types/index.js';

export function createSearchCommand(): Command {
  const searchCmd = new Command('search').description('搜索音乐');

  const createSubCommand = (type: SearchType, description: string) => {
    return new Command(type)
      .description(description)
      .argument('<keyword>', '搜索关键词')
      .option('-l, --limit <number>', '结果数量', '20')
      .option('-o, --offset <number>', '偏移量', '0')
      .action(async (keyword: string, options) => {
        try {
          const result = await search(keyword, type, parseInt(options.limit), parseInt(options.offset));
          output(result);
        } catch (error) {
          outputError('SEARCH_ERROR', error instanceof Error ? error.message : '搜索失败');
          process.exit(ExitCode.NETWORK_ERROR);
        }
      });
  };

  searchCmd.addCommand(createSubCommand('track', '搜索歌曲'));
  searchCmd.addCommand(createSubCommand('album', '搜索专辑'));
  searchCmd.addCommand(createSubCommand('playlist', '搜索歌单'));
  searchCmd.addCommand(createSubCommand('artist', '搜索歌手'));

  return searchCmd;
}
