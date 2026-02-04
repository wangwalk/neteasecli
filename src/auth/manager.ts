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

  async importFromBrowser(browser: string): Promise<void> {
    // 这里可以集成 sweet-cookie 或其他工具
    // 目前仅提示用户手动导出
    throw new Error(
      `暂不支持直接从 ${browser} 导入，请使用 sweet-cookie 工具导出 Cookie 后使用 --file 导入`
    );
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
