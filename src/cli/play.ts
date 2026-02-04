import { Command } from 'commander';
import { getTrackDetail, getTrackUrl } from '../api/track.js';
import { getPlaylistDetail } from '../api/playlist.js';
import { ensureMpvConnected } from '../player/mpv.js';
import { getPlayQueue } from '../player/queue.js';
import { output, outputError } from '../output/json.js';
import { ExitCode, type PlayMode, type Quality } from '../types/index.js';

export function createPlayCommand(): Command {
  const play = new Command('play')
    .description('播放歌曲')
    .argument('[track_id]', '歌曲 ID')
    .option('--playlist <id>', '播放歌单')
    .option('-q, --quality <level>', '音质: standard/higher/exhigh/lossless/hires', 'exhigh')
    .action(async (trackId: string | undefined, options) => {
      try {
        const player = await ensureMpvConnected();
        const queue = getPlayQueue();
        const quality = options.quality as Quality;

        if (options.playlist) {
          // 播放歌单
          const playlist = await getPlaylistDetail(options.playlist);
          if (!playlist.tracks || playlist.tracks.length === 0) {
            outputError('EMPTY_PLAYLIST', '歌单为空');
            process.exit(ExitCode.GENERAL_ERROR);
          }

          queue.setQueue(playlist.tracks, 0);
          const firstTrack = playlist.tracks[0];
          const url = await getTrackUrl(firstTrack.id, quality);
          await player.playTrackUrl(url);

          output({
            message: `正在播放歌单: ${playlist.name}`,
            track: {
              id: firstTrack.id,
              name: firstTrack.name,
              artist: firstTrack.artists.map((a) => a.name).join(', '),
            },
            queueLength: playlist.tracks.length,
          });
        } else if (trackId) {
          // 播放单曲
          const track = await getTrackDetail(trackId);
          const url = await getTrackUrl(trackId, quality);

          queue.setQueue([track], 0);
          await player.playTrackUrl(url);

          output({
            message: '正在播放',
            track: {
              id: track.id,
              name: track.name,
              artist: track.artists.map((a) => a.name).join(', '),
              album: track.album.name,
            },
          });
        } else {
          // 继续播放当前队列
          const currentTrack = queue.getCurrentTrack();
          if (!currentTrack) {
            outputError('NO_TRACK', '没有可播放的歌曲');
            process.exit(ExitCode.GENERAL_ERROR);
          }

          const url = await getTrackUrl(currentTrack.id, quality);
          await player.playTrackUrl(url);

          output({
            message: '继续播放',
            track: {
              id: currentTrack.id,
              name: currentTrack.name,
              artist: currentTrack.artists.map((a) => a.name).join(', '),
            },
          });
        }
      } catch (error) {
        outputError('PLAY_ERROR', error instanceof Error ? error.message : '播放失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });

  return play;
}

export function createPauseCommand(): Command {
  return new Command('pause')
    .description('暂停播放')
    .action(async () => {
      try {
        const player = await ensureMpvConnected();
        await player.pause();
        output({ message: '已暂停' });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : '暂停失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });
}

export function createResumeCommand(): Command {
  return new Command('resume')
    .description('继续播放')
    .action(async () => {
      try {
        const player = await ensureMpvConnected();
        await player.resume();
        output({ message: '继续播放' });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : '继续失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });
}

export function createNextCommand(): Command {
  return new Command('next')
    .description('播放下一首')
    .option('-q, --quality <level>', '音质', 'exhigh')
    .action(async (options) => {
      try {
        const player = await ensureMpvConnected();
        const queue = getPlayQueue();
        const nextTrack = queue.getNextTrack();

        if (!nextTrack) {
          outputError('NO_NEXT', '没有下一首歌曲');
          process.exit(ExitCode.GENERAL_ERROR);
        }

        const url = await getTrackUrl(nextTrack.id, options.quality as Quality);
        await player.playTrackUrl(url);

        output({
          message: '播放下一首',
          track: {
            id: nextTrack.id,
            name: nextTrack.name,
            artist: nextTrack.artists.map((a) => a.name).join(', '),
          },
        });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : '切换失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });
}

export function createPrevCommand(): Command {
  return new Command('prev')
    .description('播放上一首')
    .option('-q, --quality <level>', '音质', 'exhigh')
    .action(async (options) => {
      try {
        const player = await ensureMpvConnected();
        const queue = getPlayQueue();
        const prevTrack = queue.getPrevTrack();

        if (!prevTrack) {
          outputError('NO_PREV', '没有上一首歌曲');
          process.exit(ExitCode.GENERAL_ERROR);
        }

        const url = await getTrackUrl(prevTrack.id, options.quality as Quality);
        await player.playTrackUrl(url);

        output({
          message: '播放上一首',
          track: {
            id: prevTrack.id,
            name: prevTrack.name,
            artist: prevTrack.artists.map((a) => a.name).join(', '),
          },
        });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : '切换失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });
}

export function createSeekCommand(): Command {
  return new Command('seek')
    .description('跳转到指定位置')
    .argument('<seconds>', '秒数')
    .action(async (seconds: string) => {
      try {
        const player = await ensureMpvConnected();
        const sec = parseFloat(seconds);
        await player.seek(sec, 'absolute');
        output({ message: `已跳转到 ${sec} 秒` });
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : '跳转失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });
}

export function createVolumeCommand(): Command {
  return new Command('volume')
    .description('设置/获取音量')
    .argument('[level]', '音量 0-100')
    .action(async (level: string | undefined) => {
      try {
        const player = await ensureMpvConnected();

        if (level !== undefined) {
          const vol = parseInt(level);
          await player.setVolume(vol);
          output({ volume: vol });
        } else {
          const vol = await player.getVolume();
          output({ volume: vol });
        }
      } catch (error) {
        outputError('PLAYER_ERROR', error instanceof Error ? error.message : '操作失败');
        process.exit(ExitCode.PLAYER_ERROR);
      }
    });
}

export function createModeCommand(): Command {
  return new Command('mode')
    .description('设置播放模式')
    .argument('<mode>', '模式: sequence/repeat/single/shuffle')
    .action(async (mode: string) => {
      const validModes: PlayMode[] = ['sequence', 'repeat', 'single', 'shuffle'];
      if (!validModes.includes(mode as PlayMode)) {
        outputError('INVALID_MODE', `无效的模式，可选: ${validModes.join('/')}`);
        process.exit(ExitCode.GENERAL_ERROR);
      }

      const queue = getPlayQueue();
      queue.setMode(mode as PlayMode);
      output({ mode });
    });
}
