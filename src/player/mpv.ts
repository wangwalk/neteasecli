import { spawn, type ChildProcess } from 'child_process';
import * as net from 'net';

const SOCKET_PATH = process.platform === 'win32'
  ? '\\\\.\\pipe\\neteasecli-mpv'
  : '/tmp/neteasecli-mpv.sock';

interface MpvResponse {
  data?: unknown;
  error?: string;
  request_id?: number;
}

class MpvPlayer {
  private process: ChildProcess | null = null;
  private currentTitle: string | undefined;
  private requestId = 0;

  async play(url: string, title?: string): Promise<void> {
    await this.stop();
    this.currentTitle = title;

    return new Promise((resolve, reject) => {
      this.process = spawn('mpv', [
        '--no-video',
        `--input-ipc-server=${SOCKET_PATH}`,
        `--title=${title || 'neteasecli'}`,
        url,
      ], {
        stdio: 'ignore',
        detached: true,
      });

      this.process.unref();

      this.process.on('error', (err) => {
        this.process = null;
        reject(new Error(`Failed to start mpv: ${err.message}`));
      });

      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve();
        } else {
          reject(new Error('mpv process exited unexpectedly'));
        }
      }, 500);

      this.process.on('exit', () => {
        this.process = null;
      });
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
    // 'no' = no loop, 'inf' = loop current file, 'force' = same but force
    await this.setProperty('loop-file', mode);
  }

  async getLoop(): Promise<string> {
    const loop = await this.getProperty('loop-file').catch(() => 'no');
    return String(loop);
  }

  async stop(): Promise<void> {
    if (this.process) {
      try {
        await this.sendCommand(['quit']);
      } catch {
        if (this.process && !this.process.killed) {
          this.process.kill();
        }
      }
      this.process = null;
      this.currentTitle = undefined;
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
    if (!this.isRunning()) {
      return { position: 0, duration: 0, paused: false, playing: false, volume: 100, loop: 'no' };
    }

    try {
      const [position, duration, paused, volume, loop] = await Promise.all([
        this.getProperty('time-pos').catch(() => 0),
        this.getProperty('duration').catch(() => 0),
        this.getProperty('pause').catch(() => false),
        this.getProperty('volume').catch(() => 100),
        this.getProperty('loop-file').catch(() => 'no'),
      ]);

      return {
        title: this.currentTitle,
        position: Number(position) || 0,
        duration: Number(duration) || 0,
        paused: Boolean(paused),
        playing: true,
        volume: Number(volume) || 100,
        loop: String(loop),
      };
    } catch {
      return { title: this.currentTitle, position: 0, duration: 0, paused: false, playing: false, volume: 100, loop: 'no' };
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
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
