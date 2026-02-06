import * as fs from 'fs';
import { saveCookies, loadCookies, clearCookies } from './storage.js';
import type { CookieData, UserProfile } from '../types/index.js';

export class AuthManager {
  private cookies: CookieData | null = null;

  constructor() {
    this.cookies = loadCookies();
  }

  async importFromFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('无效的 JSON 文件');
    }

    const cookies = this.parseCookies(parsed);

    if (!cookies.MUSIC_U) {
      throw new Error('Cookie 中缺少 MUSIC_U，请确保已登录网易云音乐');
    }

    this.cookies = cookies;
    saveCookies(cookies);
  }

  private parseCookies(data: unknown): CookieData {
    // 支持多种格式

    // 格式1: Sweet Cookie 导出格式 (数组)
    if (Array.isArray(data)) {
      const cookies: CookieData = {};
      for (const item of data) {
        if (item && typeof item === 'object' && 'name' in item && 'value' in item) {
          cookies[item.name as string] = item.value as string;
        }
      }
      return cookies;
    }

    // 格式2: 简单 key-value 对象
    if (typeof data === 'object' && data !== null) {
      return data as CookieData;
    }

    throw new Error('不支持的 Cookie 格式');
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
      console.warn('⚠️  Cookie 提取警告:', warnings.join(', '));
    }

    const cookieData: CookieData = {};
    for (const cookie of cookies) {
      cookieData[cookie.name] = cookie.value;
    }

    if (!cookieData.MUSIC_U) {
      throw new Error(
        '未能从 Chrome 中找到网易云音乐的登录信息\n' +
          '请确保：\n' +
          '1. 已在 Chrome 中登录 https://music.163.com\n' +
          (profile ? `2. 使用的是正确的 Profile: ${profile}` : '2. 使用的是默认 Profile')
      );
    }

    this.cookies = cookieData;
    saveCookies(cookieData);
  }

  async checkAuth(): Promise<{ valid: boolean; userId?: string; nickname?: string; error?: string }> {
    if (!this.isAuthenticated()) {
      return { valid: false, error: '未登录' };
    }

    try {
      // 调用网易云 API 验证登录态
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
        error: error instanceof Error ? error.message : '登录态已失效',
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

  getMusicU(): string {
    return this.cookies?.MUSIC_U || '';
  }

  logout(): void {
    this.cookies = null;
    clearCookies();
  }

  getStatus(): { authenticated: boolean; musicU?: string } {
    return {
      authenticated: this.isAuthenticated(),
      musicU: this.cookies?.MUSIC_U ? `${this.cookies.MUSIC_U.slice(0, 10)}...` : undefined,
    };
  }
}

// 单例
let authManagerInstance: AuthManager | null = null;

export function getAuthManager(): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}
