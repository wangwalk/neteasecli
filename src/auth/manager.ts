import { saveCookies, loadCookies, clearCookies } from './storage.js';
import type { CookieData } from '../types/index.js';

export class AuthManager {
  private cookies: CookieData | null = null;

  constructor() {
    this.cookies = loadCookies();
  }

  async importFromBrowser(profile?: string): Promise<void> {
    const { getCookies } = await import('@steipete/sweet-cookie');

    const options: any = {
      url: 'https://music.163.com/',
      names: ['MUSIC_U', '__csrf'],
      browsers: ['chrome'],
    };

    if (profile) {
      options.chromeProfile = profile;
    }

    const { cookies, warnings } = await getCookies(options);

    const cookieData: CookieData = {};
    for (const cookie of cookies) {
      cookieData[cookie.name] = cookie.value;
    }

    if (!cookieData.MUSIC_U) {
      const parts = ['Could not find Netease login cookies in Chrome.'];
      if (warnings.length > 0) {
        parts.push('', 'Warnings:');
        for (const w of warnings) {
          parts.push(`  - ${w}`);
        }
      }
      parts.push(
        '',
        'Options:',
        '  1. Login to music.163.com in Chrome',
        '  2. Run `neteasecli auth login`',
        profile ? `  3. Check Chrome profile: ${profile}` : '  3. Use --profile <name> for a specific Chrome profile',
      );
      throw new Error(parts.join('\n'));
    }

    if (warnings.length > 0) {
      const { verbose } = await import('../output/logger.js');
      for (const w of warnings) {
        verbose(`Cookie import warning: ${w}`);
      }
    }

    this.cookies = cookieData;
    saveCookies(cookieData);
  }

  async checkAuth(): Promise<{
    valid: boolean;
    userId?: string;
    nickname?: string;
    error?: string;
    credentials: { MUSIC_U: boolean; __csrf: boolean };
    warnings: string[];
  }> {
    const credentials = {
      MUSIC_U: !!this.cookies?.MUSIC_U,
      __csrf: !!this.cookies?.__csrf,
    };
    const warnings: string[] = [];

    if (!this.cookies) {
      warnings.push('No session file found. Run `neteasecli auth login` to import cookies from Chrome.');
      return { valid: false, error: 'Not logged in', credentials, warnings };
    }

    if (!credentials.MUSIC_U) {
      warnings.push('Missing MUSIC_U cookie — login session not found');
    }
    if (!credentials.__csrf) {
      warnings.push('Missing __csrf cookie — some API calls may fail');
    }

    if (!credentials.MUSIC_U) {
      return { valid: false, error: 'Missing credentials', credentials, warnings };
    }

    try {
      const { getUserProfile } = await import('../api/user.js');
      const profile = await getUserProfile();
      return {
        valid: true,
        userId: profile.id,
        nickname: profile.nickname,
        credentials,
        warnings,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Session expired';
      warnings.push(`Session validation failed: ${msg}`);
      return { valid: false, error: msg, credentials, warnings };
    }
  }

  isAuthenticated(): boolean {
    return this.cookies !== null && !!this.cookies.MUSIC_U;
  }

  getCookies(): CookieData | null {
    return this.cookies;
  }

  getCookieString(): string {
    if (!this.cookies) return '';
    return Object.entries(this.cookies)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  getCsrfToken(): string {
    return this.cookies?.__csrf || '';
  }

  logout(): void {
    this.cookies = null;
    clearCookies();
  }

}

let authManagerInstance: AuthManager | null = null;

export function getAuthManager(): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

export function resetAuthManager(): void {
  authManagerInstance = null;
}
