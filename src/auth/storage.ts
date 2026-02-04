import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CookieData } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'neteasecli');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveCookies(cookies: CookieData): void {
  ensureConfigDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
}

export function loadCookies(): CookieData | null {
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }
  try {
    const content = fs.readFileSync(SESSION_FILE, 'utf-8');
    return JSON.parse(content) as CookieData;
  } catch {
    return null;
  }
}

export function clearCookies(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getSessionFile(): string {
  return SESSION_FILE;
}
