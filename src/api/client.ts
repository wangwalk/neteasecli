import axios, { AxiosInstance, AxiosError } from 'axios';
import { weapi, linuxapi, eapi } from './crypto.js';
import { getAuthManager } from '../auth/manager.js';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';

// 强制 IPv4，避免 IPv6 触发 CDN 防盗链
const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

const BASE_URL = 'https://music.163.com';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type CryptoType = 'weapi' | 'linuxapi' | 'eapi';

export interface RequestOptions {
  crypto?: CryptoType;
  url?: string; // eapi 需要的 URL 路径
}

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://music.163.com',
        Origin: 'https://music.163.com',
        'X-Real-IP': '118.88.88.88',
      },
    });
  }

  private getCookieHeader(): string {
    const authManager = getAuthManager();
    return authManager.getCookieString();
  }

  private getCsrf(): string {
    const authManager = getAuthManager();
    return authManager.getCsrfToken();
  }

  async request<T>(
    endpoint: string,
    data: object = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const { crypto: cryptoType = 'weapi' } = options;

    let url: string;
    let postData: Record<string, string>;

    // 添加 csrf_token
    const requestData = {
      ...data,
      csrf_token: this.getCsrf(),
    };

    switch (cryptoType) {
      case 'weapi': {
        url = `/weapi${endpoint}`;
        const encrypted = weapi(requestData);
        postData = {
          params: encrypted.params,
          encSecKey: encrypted.encSecKey,
        };
        break;
      }
      case 'linuxapi': {
        url = '/api/linux/forward';
        const encrypted = linuxapi({
          method: 'POST',
          url: `${BASE_URL}/api${endpoint}`,
          params: requestData,
        });
        postData = { eparams: encrypted.eparams };
        break;
      }
      case 'eapi': {
        const eapiUrl = options.url || `/api${endpoint}`;
        url = `/eapi${endpoint}`;
        const encrypted = eapi(eapiUrl, requestData);
        postData = { params: encrypted.params };
        break;
      }
    }

    try {
      const response = await this.client.post<T>(url, new URLSearchParams(postData).toString(), {
        headers: {
          Cookie: this.getCookieHeader(),
        },
      });

      // 检查网易云返回的业务错误码
      const responseData = response.data as { code?: number; message?: string; msg?: string };
      if (responseData.code && responseData.code !== 200) {
        throw new Error(responseData.message || responseData.msg || `API 错误: ${responseData.code}`);
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new Error('网络连接失败，请检查网络');
        }
        if (error.response?.status === 401) {
          throw new Error('认证失败，请重新登录');
        }
        if (error.response?.status === 403) {
          throw new Error('访问被拒绝，可能需要登录或 Cookie 已过期');
        }
        throw new Error(`请求失败: ${error.message}`);
      }
      throw error;
    }
  }

  async download(url: string, destPath: string): Promise<void> {
    // CDN 防盗链: 部分节点(m704/m804)会 403，使用备用节点(m801)重试
    const CDN_FALLBACKS = ['m801', 'm701'];

    const tryDownload = async (dlUrl: string): Promise<Readable> => {
      const response = await axios.get<Readable>(dlUrl, {
        responseType: 'stream',
        timeout: 120000,
        httpAgent,
        httpsAgent,
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://music.163.com/',
        },
      });
      return response.data;
    };

    let lastError: Error | null = null;

    // 先尝试原始 URL
    try {
      const stream = await tryDownload(url);
      await pipeline(stream, fs.createWriteStream(destPath));
      return;
    } catch (e) {
      const isAntiHotlink = e instanceof AxiosError && e.response?.status === 403;
      if (!isAntiHotlink) throw e;
      lastError = e as Error;
    }

    // 403 时切换 CDN 节点重试
    for (const fallback of CDN_FALLBACKS) {
      const altUrl = url.replace(/m\d+\.music\.126\.net/, `${fallback}.music.126.net`);
      try {
        const stream = await tryDownload(altUrl);
        await pipeline(stream, fs.createWriteStream(destPath));
        return;
      } catch (e) {
        lastError = e as Error;
      }
    }

    throw lastError || new Error('下载失败');
  }
}

// 单例
let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    clientInstance = new ApiClient();
  }
  return clientInstance;
}
