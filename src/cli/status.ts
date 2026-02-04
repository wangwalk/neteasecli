import { Command } from 'commander';
import { ensureMpvConnected, getMpvPlayer } from '../player/mpv.js';
import { getPlayQueue } from '../player/queue.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('查看播放状态')
    .action(async () => {
      try {
        const player = await ensureMpvConnected();
        const state = await player.getPlaybackState();
        output(state);
      } catch (error) {
        // 如果无法连接 mpv，返回基本状态
        const queue = getPlayQueue();
        output({
          playing: false,
          track: queue.getCurrentTrack()
            ? {
                id: queue.getCurrentTrack()!.id,
                name: queue.getCurrentTrack()!.name,
                artist: queue.getCurrentTrack()!.artists.map((a) => a.name).join(', '),
              }
            : null,
          position: 0,
          duration: 0,
          volume: queue.getVolume(),
          mode: queue.getMode(),
          mpvConnected: false,
        });
      }
    });
}

export function createQueueCommand(): Command {
  const queueCmd = new Command('queue').description('播放队列管理');

  // 查看队列
  queueCmd
    .command('list')
    .description('查看播放队列')
    .action(() => {
      const queue = getPlayQueue();
      const items = queue.getQueue();
      output({
        currentIndex: queue.getCurrentIndex(),
        mode: queue.getMode(),
        tracks: items.map((item) => ({
          index: item.index,
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map((a) => a.name).join(', '),
          isCurrent: item.index === queue.getCurrentIndex(),
        })),
        total: items.length,
      });
    });

  // 添加到队列
  queueCmd
    .command('add')
    .description('添加歌曲到队列')
    .argument('<track_id>', '歌曲 ID')
    .action(async (trackId: string) => {
      try {
        const { getTrackDetail } = await import('../api/track.js');
        const track = await getTrackDetail(trackId);
        const queue = getPlayQueue();
        queue.add(track);
        output({
          message: '已添加到队列',
          track: {
            id: track.id,
            name: track.name,
            artist: track.artists.map((a) => a.name).join(', '),
          },
          queueLength: queue.length(),
        });
      } catch (error) {
        outputError('ADD_ERROR', error instanceof Error ? error.message : '添加失败');
        process.exit(ExitCode.GENERAL_ERROR);
      }
    });

  // 清空队列
  queueCmd
    .command('clear')
    .description('清空播放队列')
    .action(async () => {
      try {
        const player = await ensureMpvConnected();
        await player.stop();
      } catch {
        // mpv 未运行也没关系
      }

      const queue = getPlayQueue();
      queue.clear();
      output({ message: '队列已清空' });
    });

  // 移除
  queueCmd
    .command('remove')
    .description('从队列移除歌曲')
    .argument('<index>', '歌曲在队列中的索引')
    .action((index: string) => {
      const queue = getPlayQueue();
      const idx = parseInt(index);
      if (idx < 0 || idx >= queue.length()) {
        outputError('INVALID_INDEX', '无效的索引');
        process.exit(ExitCode.GENERAL_ERROR);
      }
      queue.remove(idx);
      output({ message: `已移除索引 ${idx} 的歌曲`, queueLength: queue.length() });
    });

  // 默认显示队列
  queueCmd.action(() => {
    const queue = getPlayQueue();
    const items = queue.getQueue();
    output({
      currentIndex: queue.getCurrentIndex(),
      mode: queue.getMode(),
      tracks: items.map((item) => ({
        index: item.index,
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists.map((a) => a.name).join(', '),
        isCurrent: item.index === queue.getCurrentIndex(),
      })),
      total: items.length,
    });
  });

  return queueCmd;
}
