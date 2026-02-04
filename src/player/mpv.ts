import * as net from 'net';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { getPlayQueue } from './queue.js';
import type { PlaybackState, Track } from '../types/index.js';

const SOCKET_PATH = '/tmp/neteasecli-mpv.sock';

interface MpvResponse {
  request_id?: number;
  error?: string;
  data?: unknown;
  event?: string;
}

export class MpvPlayer {
  private socket: net.Socket | null = null;
  private requestId: number = 0;
  private pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();
  private buffer: string = '';
  private mpvProcess: ChildProcess | null = null;

  async connect(): Promise<void> {
    // 检查 socket 是否存在
    if (!fs.existsSync(SOCKET_PATH)) {
      await this.startMpv();
      // 等待 mpv 启动
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(SOCKET_PATH);

      this.socket.on('connect', () => {
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data.toString());
      });

      this.socket.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT' || (err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
          reject(new Error('mpv 未运行，请先启动 mpv 或使用 neteasecli play 命令'));
        } else {
          reject(err);
        }
      });

      this.socket.on('close', () => {
        this.socket = null;
      });
    });
  }

  private async startMpv(): Promise<void> {
    // 检查 mpv 是否已安装
    return new Promise((resolve, reject) => {
      this.mpvProcess = spawn('mpv', [
        '--idle',
        `--input-ipc-server=${SOCKET_PATH}`,
        '--no-video',
        '--quiet',
        '--really-quiet',
      ], {
        detached: true,
        stdio: 'ignore',
      });

      this.mpvProcess.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('mpv 未安装，请先安装 mpv: brew install mpv'));
        } else {
          reject(err);
        }
      });

      // 分离进程，让它在后台运行
      this.mpvProcess.unref();
      resolve();
    });
  }

  private handleData(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as MpvResponse;

        // 处理事件
        if (response.event) {
          this.handleEvent(response.event, response);
          continue;
        }

        // 处理请求响应
        if (response.request_id !== undefined) {
          const pending = this.pendingRequests.get(response.request_id);
          if (pending) {
            this.pendingRequests.delete(response.request_id);
            if (response.error && response.error !== 'success') {
              pending.reject(new Error(response.error));
            } else {
              pending.resolve(response.data);
            }
          }
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  private handleEvent(event: string, _data: MpvResponse): void {
    // 处理 end-file 事件用于自动切歌
    if (event === 'end-file') {
      const queue = getPlayQueue();
      const nextTrack = queue.getNextTrack();
      if (nextTrack) {
        // 异步播放下一首，不阻塞事件处理
        this.playTrackUrl(nextTrack.uri).catch(() => {});
      }
    }
  }

  private async sendCommand(command: unknown[]): Promise<unknown> {
    if (!this.socket) {
      throw new Error('未连接到 mpv');
    }

    const requestId = ++this.requestId;
    const request = {
      command,
      request_id: requestId,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.socket!.write(JSON.stringify(request) + '\n');

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, 5000);
    });
  }

  async getProperty<T>(name: string): Promise<T> {
    const result = await this.sendCommand(['get_property', name]);
    return result as T;
  }

  async setProperty(name: string, value: unknown): Promise<void> {
    await this.sendCommand(['set_property', name, value]);
  }

  async command(cmd: string, args: unknown[] = []): Promise<void> {
    await this.sendCommand([cmd, ...args]);
  }

  async playTrackUrl(url: string): Promise<void> {
    await this.sendCommand(['loadfile', url, 'replace']);
  }

  async pause(): Promise<void> {
    await this.setProperty('pause', true);
  }

  async resume(): Promise<void> {
    await this.setProperty('pause', false);
  }

  async togglePause(): Promise<boolean> {
    const paused = await this.getProperty<boolean>('pause');
    await this.setProperty('pause', !paused);
    return !paused;
  }

  async seek(seconds: number, mode: 'absolute' | 'relative' = 'absolute'): Promise<void> {
    await this.sendCommand(['seek', seconds, mode]);
  }

  async setVolume(volume: number): Promise<void> {
    await this.setProperty('volume', Math.max(0, Math.min(100, volume)));
    getPlayQueue().setVolume(volume);
  }

  async getVolume(): Promise<number> {
    return this.getProperty<number>('volume');
  }

  async getPosition(): Promise<number> {
    try {
      return await this.getProperty<number>('time-pos');
    } catch {
      return 0;
    }
  }

  async getDuration(): Promise<number> {
    try {
      return await this.getProperty<number>('duration');
    } catch {
      return 0;
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      return await this.getProperty<boolean>('pause');
    } catch {
      return true;
    }
  }

  async isIdle(): Promise<boolean> {
    try {
      return await this.getProperty<boolean>('idle-active');
    } catch {
      return true;
    }
  }

  async getPlaybackState(): Promise<PlaybackState> {
    const queue = getPlayQueue();
    const currentTrack = queue.getCurrentTrack();

    let playing = false;
    let position = 0;
    let duration = 0;
    let volume = queue.getVolume();

    try {
      const idle = await this.isIdle();
      if (!idle) {
        playing = !(await this.isPaused());
        position = await this.getPosition();
        duration = await this.getDuration();
        volume = await this.getVolume();
      }
    } catch {
      // mpv 可能未连接
    }

    return {
      playing,
      track: currentTrack
        ? {
            id: currentTrack.id,
            name: currentTrack.name,
            artist: currentTrack.artists.map((a) => a.name).join(', '),
          }
        : null,
      position,
      duration,
      volume,
      mode: queue.getMode(),
    };
  }

  async stop(): Promise<void> {
    await this.sendCommand(['stop']);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}

// 单例
let mpvInstance: MpvPlayer | null = null;

export function getMpvPlayer(): MpvPlayer {
  if (!mpvInstance) {
    mpvInstance = new MpvPlayer();
  }
  return mpvInstance;
}

export async function ensureMpvConnected(): Promise<MpvPlayer> {
  const player = getMpvPlayer();
  await player.connect();
  return player;
}
