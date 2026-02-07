import { spawn, type ChildProcess } from 'child_process';
import * as net from 'net';

const SOCKET_PATH = '/tmp/neteasecli-mpv.sock';

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
  }> {
    if (!this.isRunning()) {
      return { position: 0, duration: 0, paused: false, playing: false };
    }

    try {
      const [position, duration, paused] = await Promise.all([
        this.getProperty('time-pos').catch(() => 0),
        this.getProperty('duration').catch(() => 0),
        this.getProperty('pause').catch(() => false),
      ]);

      return {
        title: this.currentTitle,
        position: Number(position) || 0,
        duration: Number(duration) || 0,
        paused: Boolean(paused),
        playing: true,
      };
    } catch {
      return { title: this.currentTitle, position: 0, duration: 0, paused: false, playing: false };
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  private getProperty(name: string): Promise<unknown> {
    return this.sendCommand(['get_property', name]);
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
