import { loadState, saveState, type PlayerState } from './state.js';
import type { Track, PlayMode, QueueItem } from '../types/index.js';

export class PlayQueue {
  private state: PlayerState;

  constructor() {
    this.state = loadState();
  }

  reload(): void {
    this.state = loadState();
  }

  save(): void {
    saveState(this.state);
  }

  getQueue(): QueueItem[] {
    return this.state.queue.map((track, index) => ({ track, index }));
  }

  getTracks(): Track[] {
    return [...this.state.queue];
  }

  getCurrentTrack(): Track | null {
    if (this.state.currentIndex < 0 || this.state.currentIndex >= this.state.queue.length) {
      return null;
    }
    return this.state.queue[this.state.currentIndex];
  }

  getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  setCurrentIndex(index: number): void {
    this.state.currentIndex = index;
    this.save();
  }

  getMode(): PlayMode {
    return this.state.mode;
  }

  setMode(mode: PlayMode): void {
    this.state.mode = mode;
    this.save();
  }

  getVolume(): number {
    return this.state.volume;
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(100, volume));
    this.save();
  }

  add(track: Track): void {
    this.state.queue.push(track);
    this.save();
  }

  addMultiple(tracks: Track[]): void {
    this.state.queue.push(...tracks);
    this.save();
  }

  remove(index: number): void {
    if (index >= 0 && index < this.state.queue.length) {
      this.state.queue.splice(index, 1);
      if (this.state.currentIndex >= index && this.state.currentIndex > 0) {
        this.state.currentIndex--;
      }
      this.save();
    }
  }

  clear(): void {
    this.state.queue = [];
    this.state.currentIndex = -1;
    this.save();
  }

  setQueue(tracks: Track[], startIndex: number = 0): void {
    this.state.queue = tracks;
    this.state.currentIndex = startIndex;
    this.save();
  }

  getNextTrack(): Track | null {
    if (this.state.queue.length === 0) return null;

    let nextIndex: number;

    switch (this.state.mode) {
      case 'single':
        // 单曲循环，返回当前歌曲
        nextIndex = this.state.currentIndex;
        break;
      case 'shuffle':
        // 随机播放
        nextIndex = Math.floor(Math.random() * this.state.queue.length);
        break;
      case 'repeat':
        // 列表循环
        nextIndex = (this.state.currentIndex + 1) % this.state.queue.length;
        break;
      case 'sequence':
      default:
        // 顺序播放
        nextIndex = this.state.currentIndex + 1;
        if (nextIndex >= this.state.queue.length) {
          return null; // 播放完毕
        }
        break;
    }

    this.state.currentIndex = nextIndex;
    this.save();
    return this.state.queue[nextIndex];
  }

  getPrevTrack(): Track | null {
    if (this.state.queue.length === 0) return null;

    let prevIndex: number;

    switch (this.state.mode) {
      case 'single':
        prevIndex = this.state.currentIndex;
        break;
      case 'shuffle':
        prevIndex = Math.floor(Math.random() * this.state.queue.length);
        break;
      default:
        prevIndex = this.state.currentIndex - 1;
        if (prevIndex < 0) {
          prevIndex = this.state.mode === 'repeat' ? this.state.queue.length - 1 : 0;
        }
        break;
    }

    this.state.currentIndex = prevIndex;
    this.save();
    return this.state.queue[prevIndex];
  }

  isEmpty(): boolean {
    return this.state.queue.length === 0;
  }

  length(): number {
    return this.state.queue.length;
  }
}

// 单例
let queueInstance: PlayQueue | null = null;

export function getPlayQueue(): PlayQueue {
  if (!queueInstance) {
    queueInstance = new PlayQueue();
  }
  return queueInstance;
}
