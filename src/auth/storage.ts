import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CookieData } from '../types/index.js';

const BASE_CONFIG_DIR = path.join(os.homedir(), '.config', 'neteasecli');

let currentProfile = 'default';

export function setProfile(name: string): void {
  if (name !== currentProfile) {
    currentProfile = name;
    // Invalidate cached auth manager so it reloads cookies for new profile
    import('../auth/manager.js').then((m) => m.resetAuthManager());
  }
}

export function getProfile(): string {
  return currentProfile;
}

function getProfileDir(): string {
  return path.join(BASE_CONFIG_DIR, 'profiles', currentProfile);
}

function getSessionFile(): string {
  return path.join(getProfileDir(), 'session.json');
}

function ensureProfileDir(): void {
  const dir = getProfileDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Migrate old flat session.json to default profile
function migrateIfNeeded(): void {
  const oldFile = path.join(BASE_CONFIG_DIR, 'session.json');
  const newFile = path.join(BASE_CONFIG_DIR, 'profiles', 'default', 'session.json');
  if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
    const dir = path.dirname(newFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(oldFile, newFile);
  }
}

// Run migration on module load
migrateIfNeeded();

export function saveCookies(cookies: CookieData): void {
  ensureProfileDir();
  fs.writeFileSync(getSessionFile(), JSON.stringify(cookies, null, 2));
}

export function loadCookies(): CookieData | null {
  const file = getSessionFile();
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content) as CookieData;
  } catch {
    return null;
  }
}

export function clearCookies(): void {
  const file = getSessionFile();
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

export function listProfiles(): string[] {
  const profilesDir = path.join(BASE_CONFIG_DIR, 'profiles');
  if (!fs.existsSync(profilesDir)) return [];
  return fs.readdirSync(profilesDir).filter((name) => {
    const sessionFile = path.join(profilesDir, name, 'session.json');
    return fs.existsSync(sessionFile);
  });
}
