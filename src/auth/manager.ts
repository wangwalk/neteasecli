import { saveCookies, loadCookies, clearCookies } from './storage.js';
import type { CookieData } from '../types/index.js';

export class AuthManager {
  private cookies: CookieData | null = null;
  private cookieSource: string | undefined;

  constructor() {
    this.cookies = loadCookies();
  }

  async importFromBrowser(profile?: string): Promise<void> {
    const { getCookies } = await import('@steipete/sweet-cookie');

    const options: any = {
      url: 'https://music.163.com/',
      names: ['MUSIC_U'],
    };

    if (profile) {
      options.chromeProfile = profile;
    }

    const { cookies, warnings } = await getCookies(options);

    const cookieData: CookieData = {};
    let source: string | undefined;
    for (const cookie of cookies) {
      cookieData[cookie.name] = cookie.value;
      if (!source && cookie.source?.browser) {
        source = cookie.source.browser;
      }
    }

    if (!cookieData.MUSIC_U) {
      const parts = ['Could not find Netease login cookies.'];
      if (warnings.length > 0) {
        parts.push('', 'Warnings:');
        for (const w of warnings) {
          parts.push(`  - ${w}`);
        }
      }
      parts.push(
        '',
        'Options:',
        '  1. Login to music.163.com in Chrome, Edge, Firefox, or Safari',
        '  2. Run `neteasecli auth login`',
        '  3. Use --profile <name> for a specific Chrome profile',
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
    this.cookieSource = source;
    saveCookies(cookieData);
  }

  async checkAuth(): Promise<{
    valid: boolean;
    userId?: string;
    nickname?: string;
    error?: string;
    credentials: { MUSIC_U: boolean };
    warnings: string[];
  }> {
    const credentials = {
      MUSIC_U: !!this.cookies?.MUSIC_U,
    };
    const warnings: string[] = [];

    if (!this.cookies) {
      warnings.push('No session file found. Run `neteasecli auth login` to import cookies from your browser.');
      return { valid: false, error: 'Not logged in', credentials, warnings };
    }

    if (!credentials.MUSIC_U) {
      warnings.push('Missing MUSIC_U cookie — login session not found');
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

  getSource(): string | undefined {
    return this.cookieSource;
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
