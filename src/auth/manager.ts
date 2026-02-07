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

    if (warnings.length > 0) {
      console.warn('Warning:', warnings.join(', '));
    }

    const cookieData: CookieData = {};
    for (const cookie of cookies) {
      cookieData[cookie.name] = cookie.value;
    }

    if (!cookieData.MUSIC_U) {
      throw new Error(
        'Could not find Netease login cookies in Chrome.\n' +
          'Please make sure:\n' +
          '1. You are logged in at https://music.163.com in Chrome\n' +
          (profile ? `2. Using the correct profile: ${profile}` : '2. Using the default profile')
      );
    }

    this.cookies = cookieData;
    saveCookies(cookieData);
  }

  async checkAuth(): Promise<{ valid: boolean; userId?: string; nickname?: string; error?: string }> {
    if (!this.isAuthenticated()) {
      return { valid: false, error: 'Not logged in' };
    }

    try {
      const { getUserProfile } = await import('../api/user.js');
      const profile = await getUserProfile();
      return {
        valid: true,
        userId: profile.id,
        nickname: profile.nickname,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Session expired',
      };
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
