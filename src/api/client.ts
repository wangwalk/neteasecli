import axios, { AxiosInstance, AxiosError } from 'axios';
import { weapi, linuxapi, eapi } from './crypto.js';
import { getAuthManager } from '../auth/manager.js';

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
}

// 单例
let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    clientInstance = new ApiClient();
  }
  return clientInstance;
}
