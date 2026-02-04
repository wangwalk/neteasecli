import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Track, PlayMode, QueueItem } from '../types/index.js';

const STATE_DIR = path.join(os.homedir(), '.config', 'neteasecli');
const STATE_FILE = path.join(STATE_DIR, 'player-state.json');

export interface PlayerState {
  queue: Track[];
  currentIndex: number;
  mode: PlayMode;
  volume: number;
}

const defaultState: PlayerState = {
  queue: [],
  currentIndex: -1,
  mode: 'sequence',
  volume: 80,
};

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

export function loadState(): PlayerState {
  if (!fs.existsSync(STATE_FILE)) {
    return { ...defaultState };
  }
  try {
    const content = fs.readFileSync(STATE_FILE, 'utf-8');
    return { ...defaultState, ...JSON.parse(content) };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: PlayerState): void {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function clearState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}
