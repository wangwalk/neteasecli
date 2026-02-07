import { spawn } from 'child_process';
import * as net from 'net';
import * as fs from 'fs';

const SOCKET_PATH =
  process.platform === 'win32' ? '\\\\.\\pipe\\neteasecli-mpv' : '/tmp/neteasecli-mpv.sock';

interface MpvResponse {
  data?: unknown;
  error?: string;
  request_id?: number;
}

class MpvPlayer {
  private requestId = 0;

  async play(url: string, title?: string): Promise<void> {
    // Stop any existing instance
    await this.stop().catch(() => {});

    // Clean up stale socket file
    if (process.platform !== 'win32' && fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(
        'mpv',
        [
          '--no-video',
          `--input-ipc-server=${SOCKET_PATH}`,
          `--title=${title || 'neteasecli'}`,
          url,
        ],
        {
          stdio: 'ignore',
          detached: true,
        },
      );

      proc.unref();

      proc.on('error', (err) => {
        reject(new Error(`Failed to start mpv: ${err.message}`));
      });

      // Wait for socket to become available
      let attempts = 0;
      const waitForSocket = () => {
        attempts++;
        const sock = net.createConnection(SOCKET_PATH);
        sock.on('connect', () => {
          sock.destroy();
          resolve();
        });
        sock.on('error', () => {
          sock.destroy();
          if (attempts < 10) {
            setTimeout(waitForSocket, 200);
          } else {
            reject(new Error('mpv started but IPC socket not available'));
          }
        });
      };
      setTimeout(waitForSocket, 300);
    });
  }

  async pause(): Promise<void> {
    await this.sendCommand(['cycle', 'pause']);
  }

  async seek(seconds: number, mode: 'relative' | 'absolute' = 'relative'): Promise<void> {
    await this.sendCommand(['seek', String(seconds), mode]);
  }

  async setVolume(volume: number): Promise<void> {
    await this.setProperty('volume', Math.max(0, Math.min(150, volume)));
  }

  async getVolume(): Promise<number> {
    const vol = await this.getProperty('volume').catch(() => 100);
    return Number(vol) || 100;
  }

  async setLoop(mode: 'no' | 'inf' | 'force'): Promise<void> {
    await this.setProperty('loop-file', mode);
  }

  async getLoop(): Promise<string> {
    const loop = await this.getProperty('loop-file').catch(() => 'no');
    return String(loop);
  }

  async stop(): Promise<void> {
    try {
      await this.sendCommand(['quit']);
    } catch {
      // mpv not running, ignore
    }
  }

  async getStatus(): Promise<{
    title?: string;
    position: number;
    duration: number;
    paused: boolean;
    playing: boolean;
    volume: number;
    loop: string;
  }> {
    try {
      const [position, duration, paused, volume, loop, title] = await Promise.all([
        this.getProperty('time-pos').catch(() => 0),
        this.getProperty('duration').catch(() => 0),
        this.getProperty('pause').catch(() => false),
        this.getProperty('volume').catch(() => 100),
        this.getProperty('loop-file').catch(() => 'no'),
        this.getProperty('media-title').catch(() => undefined),
      ]);

      return {
        title: title ? String(title) : undefined,
        position: Number(position) || 0,
        duration: Number(duration) || 0,
        paused: Boolean(paused),
        playing: true,
        volume: Number(volume) || 100,
        loop: String(loop),
      };
    } catch {
      return { position: 0, duration: 0, paused: false, playing: false, volume: 100, loop: 'no' };
    }
  }

  async isRunning(): Promise<boolean> {
    try {
      await this.getProperty('pid');
      return true;
    } catch {
      return false;
    }
  }

  private getProperty(name: string): Promise<unknown> {
    return this.sendCommand(['get_property', name]);
  }

  private setProperty(name: string, value: unknown): Promise<unknown> {
    return this.sendCommand(['set_property', name, value]);
  }

  private sendCommand(command: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const socket = net.createConnection(SOCKET_PATH);
      let buffer = '';

      socket.on('connect', () => {
        const msg = JSON.stringify({ command, request_id: id }) + '\n';
        socket.write(msg);
      });

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed: MpvResponse = JSON.parse(line);
            if (parsed.request_id === id) {
              socket.destroy();
              if (parsed.error && parsed.error !== 'success') {
                reject(new Error(parsed.error));
              } else {
                resolve(parsed.data);
              }
              return;
            }
          } catch {
            // Ignore unparseable lines (event messages, etc.)
          }
        }
      });

      socket.on('error', (err) => {
        reject(new Error(`mpv IPC connection failed: ${err.message}`));
      });

      setTimeout(() => {
        socket.destroy();
        reject(new Error('mpv IPC timeout'));
      }, 3000);
    });
  }
}

export const mpvPlayer = new MpvPlayer();
